import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('dcim', '0001_initial'),
        ('netbox_map', '0034_coolingsnapshot'),
    ]

    operations = [
        migrations.AddField(
            model_name='floorplantile',
            name='rack',
            field=models.ForeignKey(
                blank=True,
                help_text='Rack monitored by this tile (temperature/power/cooling)',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                to='dcim.rack',
                verbose_name='Rack',
            ),
        ),
    ]
