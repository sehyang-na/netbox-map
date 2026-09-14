from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('netbox_map', '0032_temperaturesnapshot'),
    ]

    operations = [
        migrations.AlterField(
            model_name='temperaturesnapshot',
            name='snapshot_type',
            field=models.CharField(
                choices=[('avg', 'Average'), ('max', 'Maximum'), ('sum', 'Sum')],
                max_length=10,
            ),
        ),
        migrations.AlterField(
            model_name='temperaturesnapshot',
            name='value',
            field=models.DecimalField(decimal_places=1, max_digits=8, verbose_name='Value'),
        ),
        migrations.AlterField(
            model_name='temperaturesnapshot',
            name='device_list',
            field=models.JSONField(blank=True, default=list, help_text='[{"name": "Device-A", "value": 31.2}, ...]'),
        ),
    ]
