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
        var pinSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="32" viewBox="0 0 24 32">'
            + '<path d="M12 0C5.373 0 0 5.373 0 12c0 8.25 12 20 12 20S24 20.25 24 12C24 5.373 18.627 0 12 0z" fill="' + color + '" stroke="#fff" stroke-width="1.5"/>'
            + '<circle cx="12" cy="12" r="4.5" fill="#fff" opacity="0.85"/>'
            + '</svg>';
        var icon = L.divIcon({
            className: '',
            html: pinSvg,
            iconSize: [24, 32],
            iconAnchor: [12, 32]
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
