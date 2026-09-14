from dcim.models import Rack, Site
from django.test import TestCase, override_settings
from django.urls import reverse
from users.models import ObjectPermission, User
from utilities.testing import ViewTestCases

from netbox_map.models import (
    Application,
    ApplicationGroup,
    CustomMarkerType,
    FloorPlan,
    RackElevationLayout,
    TopologySavedView,
)
from netbox_map.views import RackElevationDataView


class FloorPlanViewTest(
    ViewTestCases.GetObjectViewTestCase,
    ViewTestCases.GetObjectChangelogViewTestCase,
    ViewTestCases.CreateObjectViewTestCase,
    ViewTestCases.EditObjectViewTestCase,
    ViewTestCases.DeleteObjectViewTestCase,
    ViewTestCases.ListObjectsViewTestCase,
    ViewTestCases.BulkDeleteObjectsViewTestCase,
):
    model = FloorPlan

    @classmethod
    def setUpTestData(cls):
        site = Site.objects.create(name='Test Site', slug='test-site')

        FloorPlan.objects.create(site=site, name='Floor 1')
        FloorPlan.objects.create(site=site, name='Floor 2')
        FloorPlan.objects.create(site=site, name='Floor 3')

        cls.form_data = {
            'site': site.pk,
            'name': 'Floor 4',
            'grid_width': 20,
            'grid_height': 20,
            'tile_size': 60,
            'description': '',
            'comments': '',
            'tags': [],
        }

    def _get_base_url(self):
        return 'plugins:netbox_map:floorplan_{}'


class CustomMarkerTypeViewTest(
    ViewTestCases.GetObjectViewTestCase,
    ViewTestCases.CreateObjectViewTestCase,
    ViewTestCases.EditObjectViewTestCase,
    ViewTestCases.DeleteObjectViewTestCase,
    ViewTestCases.ListObjectsViewTestCase,
    ViewTestCases.BulkDeleteObjectsViewTestCase,
):
    model = CustomMarkerType

    @classmethod
    def setUpTestData(cls):
        CustomMarkerType.objects.create(name='Type A', slug='custom_type_a')
        CustomMarkerType.objects.create(name='Type B', slug='custom_type_b')
        CustomMarkerType.objects.create(name='Type C', slug='custom_type_c')

        cls.form_data = {
            'name': 'Type D',
            'slug': 'custom_type_d',
            'color': '#ff5733',
            'icon': 'mdi-shape',
            'icon_foreground': 'auto',
            'description': '',
            'tags': [],
        }

    def _get_base_url(self):
        return 'plugins:netbox_map:custommarkertype_{}'


class ApplicationGroupViewTest(
    ViewTestCases.GetObjectViewTestCase,
    ViewTestCases.CreateObjectViewTestCase,
    ViewTestCases.EditObjectViewTestCase,
    ViewTestCases.DeleteObjectViewTestCase,
    ViewTestCases.ListObjectsViewTestCase,
    ViewTestCases.BulkDeleteObjectsViewTestCase,
):
    model = ApplicationGroup

    @classmethod
    def setUpTestData(cls):
        ApplicationGroup.objects.create(name='Group A', slug='group-a')
        ApplicationGroup.objects.create(name='Group B', slug='group-b')
        ApplicationGroup.objects.create(name='Group C', slug='group-c')

        cls.form_data = {
            'name': 'Group D',
            'slug': 'group-d',
            'color': '#3498db',
            'description': '',
            'tags': [],
        }

    def _get_base_url(self):
        return 'plugins:netbox_map:applicationgroup_{}'


class ApplicationViewTest(
    ViewTestCases.GetObjectViewTestCase,
    ViewTestCases.CreateObjectViewTestCase,
    ViewTestCases.EditObjectViewTestCase,
    ViewTestCases.DeleteObjectViewTestCase,
    ViewTestCases.ListObjectsViewTestCase,
    ViewTestCases.BulkDeleteObjectsViewTestCase,
):
    model = Application

    @classmethod
    def setUpTestData(cls):
        Application.objects.create(name='App A')
        Application.objects.create(name='App B')
        Application.objects.create(name='App C')

        cls.form_data = {
            'name': 'App D',
            'status': 'active',
            'criticality': 'medium',
            'environment': 'production',
            'version': '',
            'description': '',
            'comments': '',
            'external_url': '',
            'default_port': None,
            'default_protocol': '',
            'tags': [],
        }

    def _get_base_url(self):
        return 'plugins:netbox_map:application_{}'


class TopologySavedViewViewTest(
    ViewTestCases.GetObjectViewTestCase,
    ViewTestCases.DeleteObjectViewTestCase,
    ViewTestCases.ListObjectsViewTestCase,
):
    model = TopologySavedView

    @classmethod
    def setUpTestData(cls):
        TopologySavedView.objects.create(name='View A')
        TopologySavedView.objects.create(name='View B')
        TopologySavedView.objects.create(name='View C')

    def _get_base_url(self):
        return 'plugins:netbox_map:topologysavedview_{}'


class TopologyViewSmokeTest(TestCase):
    """Smoke test that the topology page loads."""

    @classmethod
    def setUpTestData(cls):
        cls.site = Site.objects.create(name='Topo Site', slug='topo-site')

    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='testpass')
        self.client.login(username='testuser', password='testpass')
        # Grant view permission on all objects
        perm = ObjectPermission.objects.create(name='View all', actions=['view'])
        perm.users.add(self.user)
        from django.contrib.contenttypes.models import ContentType
        perm.object_types.set(ContentType.objects.all())

    @override_settings(LOGIN_REQUIRED=False, EXEMPT_VIEW_PERMISSIONS=['*'])
    def test_topology_page_loads(self):
        url = reverse('plugins:netbox_map:topology')
        response = self.client.get(url, {'site_id': self.site.pk})
        self.assertIn(response.status_code, [200, 302])


class RackElevationLayoutViewTest(
    ViewTestCases.GetObjectViewTestCase,
    ViewTestCases.GetObjectChangelogViewTestCase,
    ViewTestCases.CreateObjectViewTestCase,
    ViewTestCases.EditObjectViewTestCase,
    ViewTestCases.DeleteObjectViewTestCase,
    ViewTestCases.ListObjectsViewTestCase,
):
    model = RackElevationLayout

    @classmethod
    def setUpTestData(cls):
        site = Site.objects.create(name='Test Site', slug='test-site')
        rack1 = Rack.objects.create(name='R1.1', site=site)
        rack2 = Rack.objects.create(name='R1.2', site=site)
        rack3 = Rack.objects.create(name='R1.3', site=site)
        rack4 = Rack.objects.create(name='R1.4', site=site)

        RackElevationLayout.objects.create(rack=rack1, layout=RackElevationLayout.default_layout())
        RackElevationLayout.objects.create(rack=rack2, layout=RackElevationLayout.default_layout())
        RackElevationLayout.objects.create(rack=rack3, layout=RackElevationLayout.default_layout())

        cls.form_data = {
            'rack': rack4.pk,
            'layout': (
                '{"P1": {"links": "k", "rechts": "k"}, '
                '"P2": {"links": "p", "rechts": "B"}, '
                '"P3": {"links": "p", "rechts": "s"}}'
            ),
            'tags': [],
        }

    def _get_base_url(self):
        return 'plugins:netbox_map:rackelevationlayout_{}'


class RackElevationDataTest(TestCase):
    def setUp(self):
        self.site = Site.objects.create(name='Site', slug='site')
        self.rack = Rack.objects.create(name='R2.1', site=self.site, u_height=42)

    def _data(self, layout=None):
        if layout is not None:
            RackElevationLayout.objects.create(rack=self.rack, layout=layout)
        return RackElevationDataView()._data(self.rack, 'front')

    def _labels(self, data):
        return [s['label'] for s in data['strips']]

    def test_default_fallback(self):
        labels = self._labels(self._data())
        self.assertEqual(labels.count('KUHLUNG'), 2)
        self.assertEqual(labels.count('POWER'), 2)
        self.assertIn('panel', labels)
        self.assertIn('switch', labels)

    def test_custom_layout(self):
        layout = {
            'P1': {'links': 'k', 'rechts': 'k'},
            'P2': {'links': 'p'},
            'P3': {'rechts': 's'},
        }
        labels = self._labels(self._data(layout))
        self.assertEqual(labels.count('KUHLUNG'), 2)
        self.assertIn('POWER', labels)
        self.assertIn('switch', labels)
        self.assertNotIn('panel', labels)
        self.assertNotIn('empty', labels)

    def test_omitted_sides_not_drawn(self):
        labels = self._labels(self._data({'P1': {'rechts': 'e'}}))
        self.assertIn('empty', labels)
        self.assertNotIn('KUHLUNG', labels)
        self.assertNotIn('POWER', labels)

    def test_lueften_entity(self):
        self.assertIn('LUEFTEN', self._labels(self._data({'P2': {'links': 'lueften'}})))

    def test_unknown_entity_skipped(self):
        layout = {
            'P1': {'links': 'k', 'rechts': 'z'},
            'P2': {'links': 'q'},
        }
        self.assertEqual(self._labels(self._data(layout)).count('KUHLUNG'), 1)

    def test_device_override_link(self):
        from dcim.models import Device, DeviceRole, DeviceType, Manufacturer

        manufacturer = Manufacturer.objects.create(name='Mfg', slug='mfg')
        devtype = DeviceType.objects.create(manufacturer=manufacturer, model='Model X', slug='model-x')
        role = DeviceRole.objects.create(name='Cooling', slug='cooling')
        dev = Device.objects.create(
            name='rittal10tuer', device_type=devtype, role=role, site=self.site,
        )
        data = self._data({'P1': {'links': {'code': 'k', 'device': 'rittal10tuer'}}})
        self.assertEqual(data['strips'][0]['label'], 'rittal10tuer')
        self.assertEqual(data['strips'][0]['device_id'], dev.pk)

    def test_kuehlung_plain_without_device(self):
        data = self._data({'P1': {'links': 'k'}})
        self.assertEqual(data['strips'][0]['label'], 'KUHLUNG')
        self.assertIsNone(data['strips'][0]['device_id'])

    def test_kuehlung_row_device_link(self):
        from dcim.models import Device, DeviceRole, DeviceType, Manufacturer

        manufacturer = Manufacturer.objects.create(name='Mfg', slug='mfg')
        devtype = DeviceType.objects.create(manufacturer=manufacturer, model='Model X', slug='model-x')
        role = DeviceRole.objects.create(name='Cooling', slug='cooling')
        Device.objects.create(
            name='rittal16tuer', device_type=devtype, role=role, site=self.site,
        )

        rack = Rack.objects.create(name='R6.1', site=self.site, u_height=42)
        RackElevationLayout.objects.create(rack=rack, layout={'P1': {'links': 'k'}})
        data = RackElevationDataView()._data(rack, 'front')
        self.assertEqual(data['strips'][0]['label'], 'rittal16tuer')
        self.assertEqual(data['strips'][0]['device_id'], Device.objects.get(name='rittal16tuer').pk)

    def test_kuehlung_plain_for_non_dot1_rack(self):
        from dcim.models import Device, DeviceRole, DeviceType, Manufacturer

        manufacturer = Manufacturer.objects.create(name='Mfg', slug='mfg')
        devtype = DeviceType.objects.create(manufacturer=manufacturer, model='Model X', slug='model-x')
        role = DeviceRole.objects.create(name='Cooling', slug='cooling')
        Device.objects.create(
            name='rittal16tuer', device_type=devtype, role=role, site=self.site,
        )

        # R6.2 is NOT a R*.1 rack — same-row cooling door must NOT be linked.
        rack = Rack.objects.create(name='R6.2', site=self.site, u_height=42)
        RackElevationLayout.objects.create(rack=rack, layout={'P1': {'links': 'k'}})
        data = RackElevationDataView()._data(rack, 'front')
        self.assertEqual(data['strips'][0]['label'], 'KUHLUNG')
        self.assertIsNone(data['strips'][0]['device_id'])
