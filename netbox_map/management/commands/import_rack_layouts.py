import json

from dcim.models import Rack
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand

from netbox_map.models import RackElevationLayout


class Command(BaseCommand):
    help = (
        'Import per-rack elevation layouts from a JSON file mapping rack name to a '
        'P1/P2/P3 → links/rechts entity layout. Existing layouts are updated.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--path',
            default='data/rack_elevation_layouts.json',
            help='Path to the layout JSON file (default: data/rack_elevation_layouts.json)',
        )
        parser.add_argument(
            '--location',
            help='Only apply layouts to racks in this location (room name, e.g. 1R04).',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Validate and report without writing anything to the database.',
        )

    def handle(self, *args, **options):
        path = options['path']
        try:
            with open(path, encoding='utf-8') as fh:
                data = json.load(fh)
        except (OSError, ValueError) as exc:
            self.stderr.write(self.style.ERROR(f'Could not read {path}: {exc}'))
            return

        if not isinstance(data, dict):
            self.stderr.write(self.style.ERROR('Top-level JSON must be an object keyed by rack name.'))
            return

        created = updated = skipped = errors = 0
        for name, layout in sorted(data.items()):
            racks = Rack.objects.filter(name=name)
            if options.get('location'):
                racks = racks.filter(location__name=options['location'])
            racks = list(racks)
            if not racks:
                skipped += 1
                self.stdout.write(self.style.WARNING(f'{name}: rack not found — skipped'))
                continue
            if len(racks) > 1:
                self.stdout.write(self.style.WARNING(
                    f'{name}: {len(racks)} racks match by name — applying to all'
                ))
            for rack in racks:
                try:
                    obj = RackElevationLayout(rack=rack, layout=layout)
                    obj.clean()
                except ValidationError as exc:
                    errors += 1
                    self.stdout.write(self.style.ERROR(f'{name} ({rack.pk}): invalid layout — {exc}'))
                    continue

                existing = RackElevationLayout.objects.filter(rack=rack).first()
                if options['dry_run']:
                    action = 'update' if existing else 'create'
                    self.stdout.write(f'{name} ({rack.pk}): would {action} layout')
                    continue
                if existing:
                    existing.layout = layout
                    existing.save()
                    updated += 1
                else:
                    obj.save()
                    created += 1

        created_str = f'created={created}' if not options['dry_run'] else 'would-create'
        updated_str = f'updated={updated}' if not options['dry_run'] else 'would-update'
        self.stdout.write(self.style.SUCCESS(
            f'Done — {created_str}, {updated_str}, skipped={skipped}, errors={errors}'
        ))
