import requests
from datetime import timedelta
from django.utils import timezone
from dcim.models import Device
from netbox.jobs import JobRunner

from .models import CoolingSnapshot, FloorPlanTile, TemperatureSnapshot

# Sensor descriptor keywords for inlet/outlet classification
INLET_KEYWORDS = ['inlet', 'back', 'InltFrnt', 'system temp']
OUTLET_KEYWORDS = ['outlet', 'front', 'exhaust', 'rear', 'InltRear']


def _sensor_type(descr):
    d = descr.lower()
    if any(k in d for k in INLET_KEYWORDS):
        return 'inlet'
    if any(k in d for k in OUTLET_KEYWORDS):
        return 'outlet'
    return None


def _device_role(device):
    role = getattr(device, 'device_role', None) or getattr(device, 'role', None)
    if not role:
        return 'unknown'
    return role.name.lower()


class SyncPrometheusTemperatureJob(JobRunner):
    class Meta:
        name = 'Sync Temperature from Prometheus'

    def run(self, data, **kwargs):
        prometheus_url = data.get('prometheus_url', 'https://prometheus.zeuthen.desy.de/')
        self.logger.info(f'Fetching from {prometheus_url}')

        inlet_hosts, outlet_hosts, all_hosts = self._query_inlet_outlet(prometheus_url)
        host_power = self._query_power(prometheus_url)
        host_cooling = self._query_cooling(prometheus_url)
        self.logger.info(
            f'Hosts: inlet={len(inlet_hosts)} outlet={len(outlet_hosts)} '
            f'all={len(all_hosts)} power={len(host_power)} cooling={len(host_cooling)}'
        )

        updated = 0
        for hostname in all_hosts:
            device = Device.objects.filter(name=hostname).first()
            if not device:
                continue
            customfield = dict(device.custom_field_data or {})
            vals = all_hosts[hostname]
            if vals:
                customfield['temperature_celsius'] = round(max(vals), 1)
            if hostname in inlet_hosts:
                customfield['temp_inlet'] = round(max(inlet_hosts[hostname]), 1)
            if hostname in outlet_hosts:
                customfield['temp_outlet'] = round(max(outlet_hosts[hostname]), 1)
            customfield['temperature_updated'] = timezone.now().strftime('%Y-%m-%d %H:%M:%S')
            device.custom_field_data = customfield
            device.save(update_fields=['custom_field_data'])
            updated += 1
        self.logger.info(f'Updated {updated} device custom_fields')

        self._update_snapshots(inlet_hosts, outlet_hosts, all_hosts, host_power, host_cooling)
        self.logger.info('Sync complete')

        SyncPrometheusTemperatureJob.enqueue(
            data={'prometheus_url': prometheus_url},
            schedule_at=timezone.now() + timedelta(minutes=5),
        )

    def _query_inlet_outlet(self, url):
        resp = requests.get(
            f'{url}/api/v1/query',
            params={'query': 'librenms_sensor{sensor_class="temperature"}'},
            timeout=30, verify=False,
        )
        resp.raise_for_status()
        items = resp.json().get('data', {}).get('result', [])

        inlet_hosts = {}
        outlet_hosts = {}
        all_hosts = {}
        for item in items:
            host = item['metric'].get('hostname', '').split('.')[0]
            descr = item['metric'].get('sensor_descr', '')
            try:
                val = float(item['value'][1])
            except (ValueError, TypeError):
                continue
            if not (0 < val <= 40):
                continue
            if 'cpu' in descr.lower():
                continue
            all_hosts.setdefault(host, []).append(val)
            stype = _sensor_type(descr)
            if stype == 'inlet':
                inlet_hosts.setdefault(host, []).append(val)
            elif stype == 'outlet':
                outlet_hosts.setdefault(host, []).append(val)

        return inlet_hosts, outlet_hosts, all_hosts

    def _query_power(self, url):
        try:
            resp = requests.get(
                f'{url}/api/v1/query',
                params={'query': 'idrac_systemPowerOutputWatts'},
                timeout=30, verify=False,
            )
            resp.raise_for_status()
            result = {}
            for item in resp.json().get('data', {}).get('result', []):
                host = item['metric'].get('hostname', '').split('.')[0]
                if not host:
                    continue
                try:
                    val = float(item['value'][1])
                except (ValueError, TypeError):
                    continue
                if val >= 0:
                    result[host] = val
            return result
        except Exception as e:
            self.logger.warning(f'Power query failed: {e}')
            return {}

    def _query_cooling(self, url):
        try:
            resp = requests.get(
                f'{url}/api/v1/query',
                params={'query': 'librenms_sensor{sensor_descr=~"[Ww]ater[ -].*"}'},
                timeout=30, verify=False,
            )
            resp.raise_for_status()
            items = resp.json().get('data', {}).get('result', [])
            hosts = {}
            for item in items:
                host = item['metric'].get('hostname', '').split('.')[0]
                descr = item['metric'].get('sensor_descr', '')
                try:
                    val = float(item['value'][1])
                except (ValueError, TypeError):
                    continue
                hosts.setdefault(host, {})
                if 'in' in descr.lower():
                    hosts[host]['water_in'] = val
                elif 'out' in descr.lower():
                    hosts[host]['water_out'] = val
            return hosts
        except Exception as e:
            self.logger.warning(f'Cooling query failed: {e}')
            return {}

    def _update_snapshots(self, inlet_hosts, outlet_hosts, all_hosts, host_power, host_cooling):
        for tile in FloorPlanTile.objects.filter(
            tile_type__in=['custom_temperature_inlet', 'custom_temperature_outlet',
                           'custom_power_consumption'],
        ).select_related('rack'):
            rack = tile.rack
            if not rack:
                continue

            if tile.tile_type == 'custom_power_consumption':
                dev_list = []
                total = 0.0
                for d in Device.objects.filter(rack=rack).order_by('-position', 'face'):
                    pw = host_power.get(d.name)
                    if pw is not None:
                        total += pw
                        dev_list.append({'name': d.name, 'value': pw})
                if not dev_list:
                    continue
                TemperatureSnapshot.objects.update_or_create(
                    tile=tile,
                    defaults=dict(snapshot_type='sum', value=round(total, 1), device_list=dev_list),
                )
                continue

            is_inlet = 'inlet' in tile.tile_type
            if is_inlet:
                host_temps = {h: inlet_hosts.get(h, all_hosts.get(h, [])) for h in all_hosts}
            else:
                host_temps = {h: outlet_hosts.get(h, all_hosts.get(h, [])) for h in all_hosts}
            dev_list = []
            temps_avg = []
            temps_max = []
            devices = Device.objects.filter(rack=rack, name__in=list(host_temps.keys())).order_by('-position', 'face')
            for d in devices:
                role = _device_role(d)
                vals = host_temps.get(d.name)
                if not vals:
                    continue
                valid = [t for t in vals if t > 0]
                if not valid:
                    continue
                per_device_max = max(valid)
                per_device_avg = round(sum(valid) / len(valid), 1)
                temps_avg.append(per_device_avg)
                temps_max.append(per_device_max)
                dev_list.append({'name': d.name, 'temperature': per_device_avg, 'role': role})
            if not temps_avg:
                continue
            avg_val = round(sum(temps_avg) / len(temps_avg), 1)
            mx = max(temps_max)
            TemperatureSnapshot.objects.update_or_create(
                tile=tile,
                defaults=dict(
                    snapshot_type='avg',
                    value=avg_val,
                    max_value=mx,
                    device_list=dev_list,
                ),
            )

        for tile in FloorPlanTile.objects.filter(tile_type='cooling'):
            label = tile.label or ''
            hostname = label.replace(' Cooling', '').strip().lower()
            if not hostname and tile.assigned_object:
                hostname = getattr(tile.assigned_object, 'name', '').lower()
            if not hostname or hostname not in host_cooling:
                continue
            data = host_cooling[hostname]
            if 'water_in' not in data or 'water_out' not in data:
                continue
            CoolingSnapshot.objects.update_or_create(
                tile=tile,
                defaults=dict(
                    hostname=hostname,
                    water_in_temp=data['water_in'],
                    water_out_temp=data['water_out'],
                ),
            )
            self.logger.info(f'Cooling {hostname}: in={data["water_in"]}°C out={data["water_out"]}°C')
