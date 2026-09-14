from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('netbox_map', '0031_alter_floorplan_background_image'),
    ]

    operations = [
        migrations.CreateModel(
            name='TemperatureSnapshot',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('snapshot_type', models.CharField(choices=[('inlet', 'Inlet'), ('outlet', 'Outlet'), ('avg', 'Average'), ('max', 'Maximum'), ('sum', 'Sum')], max_length=10)),
                ('value', models.DecimalField(decimal_places=1, max_digits=8, verbose_name='Value')),
                ('device_list', models.JSONField(blank=True, default=list, help_text='[{"name": "Device-A", "value": 31.2}, ...]')),
                ('updated', models.DateTimeField(auto_now=True)),
                ('tile', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='temperature_snapshot', to='netbox_map.floorplantile')),
            ],
            options={
                'verbose_name': 'temperature snapshot',
                'verbose_name_plural': 'temperature snapshots',
            },
        ),
    ]
