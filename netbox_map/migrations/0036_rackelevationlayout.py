import django.db.models.deletion
import netbox.models.deletion
import taggit.managers
import utilities.json
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('dcim', '0001_initial'),
        ('extras', '0001_initial'),
        ('netbox_map', '0035_floorplantile_rack'),
    ]

    operations = [
        migrations.CreateModel(
            name='RackElevationLayout',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('created', models.DateTimeField(auto_now_add=True, null=True)),
                ('last_updated', models.DateTimeField(auto_now=True, null=True)),
                ('custom_field_data', models.JSONField(blank=True, default=dict, encoder=utilities.json.CustomFieldJSONEncoder)),
                (
                    'rack',
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='elevation_layout',
                        to='dcim.rack',
                        verbose_name='Rack',
                    ),
                ),
                (
                    'layout',
                    models.JSONField(
                        blank=True,
                        default=dict,
                        verbose_name='layout',
                    ),
                ),
                ('tags', taggit.managers.TaggableManager(through='extras.TaggedItem', to='extras.Tag')),
            ],
            options={
                'verbose_name': 'rack elevation layout',
                'verbose_name_plural': 'rack elevation layouts',
                'ordering': ('rack__name',),
            },
            bases=(netbox.models.deletion.DeleteMixin, models.Model),
        ),
    ]
