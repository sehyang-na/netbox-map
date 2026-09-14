/**
 * RackElevation — renders the rack-elevation SVG in the browser from the JSON
 * returned by the rack_elevation_data endpoint.
 */
window.FloorplanApp = window.FloorplanApp || {};
(function(App) {
    'use strict';

    var C = { UH: 30, PW: 30, UL: 26, MW: 240, SWW: 30, HEAD: 30, MARGIN: 12 };
    var esc = function(v) {
        return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    };

    App.RackElevation = {
        render: function(data) {
            var rack = data.rack || {}, face = data.face || 'front';
            var uh = rack.u_height || 42, y0 = C.MARGIN + C.HEAD, bodyH = uh * C.UH;
            var W = 2 * C.MARGIN + C.PW + C.UL + C.MW + C.SWW;
            var H = 2 * C.MARGIN + C.HEAD + bodyH;
            var top = function(u) { return y0 + (uh - u) * C.UH; };
            var pwX = C.MARGIN, fX = C.MARGIN + C.PW + C.UL, swX = fX + C.MW;
            var s = ['<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H +
                     '" viewBox="0 0 ' + W + ' ' + H + '" font-family="Helvetica, Arial, sans-serif">'];
            var tag = function(str) { s.push(str); };

            tag('<text x="' + C.MARGIN + '" y="' + (y0 - 10) + '" font-size="14" font-weight="bold" fill="#333">' +
                esc(rack.name) + ' \u2014 elevation (' + face + ')</text>');
            tag('<rect x="' + fX + '" y="' + y0 + '" width="' + C.MW + '" height="' + bodyH +
                '" fill="#fafafa" stroke="#666" fill-opacity="0.5"/>');
            tag('<text x="' + (pwX + C.PW / 2) + '" y="' + (y0 - 6) + '" font-size="11" font-weight="bold" fill="#d35400" text-anchor="middle">PWR</text>');
            tag('<text x="' + (swX + C.SWW / 2) + '" y="' + (y0 - 6) + '" font-size="11" font-weight="bold" fill="#1e8449" text-anchor="middle">SWITCH</text>');

            (data.strips || []).forEach(function(st) {
                var left = st.side === 'left', x = left ? pwX : swX;
                var t = top(st.hi), h = (st.hi - st.lo + 1) * C.UH;
                var stripW = (left ? C.PW : C.SWW) - 4;
                var fs = Math.max(6, Math.min((h * 0.8) / Math.max(st.label.length, 1), stripW * 0.8));
                var cx = x + (left ? C.PW : C.SWW) / 2, cy = t + h / 2;
                var body = '<rect x="' + (x + 1) + '" y="' + t + '" width="' + (stripW + 2) + '" height="' +
                    (h > 4 ? h - 2 : h) + '" fill="' + esc(st.fill) + '" rx="2" stroke="' + esc(st.stroke) + '"/>';
                body += '<text x="' + cx + '" y="' + cy + '" font-size="' + fs.toFixed(1) + '" font-weight="bold" fill="#fff" text-anchor="middle" transform="rotate(90 ' + cx + ' ' + cy + ')">' + esc(st.label) + '</text>';
                tag((st.device_id ? '<a href="/dcim/devices/' + st.device_id + '/">' : '') + body +
                    (st.device_id ? '</a>' : ''));
            });

            for (var u = 1; u <= uh; u++) {
                var y = top(u);
                tag('<line x1="' + fX + '" y1="' + y + '" x2="' + (fX + C.MW) + '" y2="' + y + '" stroke="#ddd" stroke-width="0.5"/>');
                tag('<text x="' + (fX - 16) + '" y="' + (y + 6) + '" font-size="8" fill="#666" text-anchor="end">' + u + '</text>');
            }
            tag('<line x1="' + fX + '" y1="' + (y0 + bodyH) + '" x2="' + (fX + C.MW) + '" y2="' + (y0 + bodyH) + '" stroke="#666"/>');

            (data.devices || []).forEach(function(d) {
                var hpx = d.height * C.UH, y = top(d.position + d.height - 1);
                var body = d.image
                    ? '<image x="' + (fX + 1) + '" y="' + (y + 1) + '" width="' + (C.MW - 2) + '" height="' +
                      (hpx - 2) + '" href="' + esc(d.image) + '" preserveAspectRatio="xMidYMid slice"/>'
                    : '<rect x="' + (fX + 1) + '" y="' + (y + 1) + '" width="' + (C.MW - 2) + '" height="' +
                      (hpx - 2) + '" fill="' + esc(d.color) + '" stroke="#444" rx="2"/>';
                tag('<a href="/dcim/devices/' + d.id + '/">' + body +
                    '<text x="' + (fX + C.MW / 2) + '" y="' + (y + hpx / 2 + 4) + '" font-size="14" font-weight="bold" fill="#fff" text-anchor="middle">' + esc(d.name) + '</text></a>');
            });

            tag('</svg>');
            return s.join('');
        }
    };
})(window.FloorplanApp);
