window.initTrapMap = function (elementId, traps) {
    if (window._trapMap) {
        window._trapMap.remove();
        window._trapMap = null;
    }

    const el = document.getElementById(elementId);
    if (!el) return;

    const map = L.map(el);
    window._trapMap = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '\u00a9 <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    const bounds = [];

    traps.forEach(function (trap) {
        const color = trap.isEnabled ? '#22c55e' : '#ef4444';
        const icon = L.divIcon({
            className: '',
            html: '<div style="width:28px;height:28px;border-radius:50%;background:' + color + ';border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-size:13px;">\ud83d\udd78\ufe0f</div>',
            iconSize: [28, 28],
            iconAnchor: [14, 14],
            popupAnchor: [0, -16]
        });

        L.marker([trap.latitude, trap.longitude], { icon: icon })
            .addTo(map)
            .bindPopup('<strong>' + trap.name + '</strong><br>' + (trap.isEnabled ? 'Enabled' : 'Disabled'));

        bounds.push([trap.latitude, trap.longitude]);
    });

    if (bounds.length === 1) {
        map.setView(bounds[0], 15);
    } else if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [40, 40] });
    }
};
