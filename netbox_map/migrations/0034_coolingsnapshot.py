from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('netbox_map', '0033_custom_snapshots'),
    ]

    operations = [
        migrations.CreateModel(
            name='CoolingSnapshot',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False)),
                ('hostname', models.CharField(blank=True, max_length=255, verbose_name='Hostname')),
                ('water_in_temp', models.DecimalField(decimal_places=1, max_digits=10, verbose_name='Water-In Temperature')),
                ('water_out_temp', models.DecimalField(decimal_places=1, max_digits=10, verbose_name='Water-Out Temperature')),
                ('updated', models.DateTimeField(auto_now=True)),
                ('tile', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='cooling_snapshot', to='netbox_map.floorplantile')),
            ],
            options={
                'verbose_name': 'cooling snapshot',
                'verbose_name_plural': 'cooling snapshots',
            },
        ),
    ]
    
