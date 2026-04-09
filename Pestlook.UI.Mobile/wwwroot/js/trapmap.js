let _dashMap = null;

window.initDashboardTrapMap = function (elementId, pins, dotNetRef) {
    if (_dashMap) { _dashMap.remove(); _dashMap = null; }

    var container = document.getElementById(elementId);
    if (!container) return;

    _dashMap = L.map(elementId, { zoomControl: true, attributionControl: false });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '\u00a9 OpenStreetMap contributors'
    }).addTo(_dashMap);

    var bounds = [];

    pins.forEach(function (pin) {
        var color = pin.isEnabled ? '#6dde84' : '#e06060';
        var icon = L.divIcon({
            className: '',
            html: '<div style="width:12px;height:12px;border-radius:50%;background:' + color + ';border:2px solid #fff;box-shadow:0 0 4px rgba(0,0,0,.5);"></div>',
            iconSize: [12, 12],
            iconAnchor: [6, 6]
        });

        var marker = L.marker([pin.latitude, pin.longitude], { icon: icon })
            .addTo(_dashMap)
            .bindTooltip(pin.name, { permanent: false, direction: 'top' });

        marker.on('click', function () {
            dotNetRef.invokeMethodAsync('OnTrapSelected', pin.id);
        });

        bounds.push([pin.latitude, pin.longitude]);
    });

    if (bounds.length > 0) {
        _dashMap.fitBounds(bounds, { padding: [24, 24], maxZoom: 16 });
    }
};
