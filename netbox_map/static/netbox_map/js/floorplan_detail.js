/**
 * FloorplanApp Detail — Detail panel, enriched AJAX, cable traces, rack elevation.
 * Depends on: floorplan_core.js
 */
(function(App) {
    'use strict';

    function Detail(state, events, interaction) {
        this.state = state;
        this.events = events;
        this.interaction = interaction;

        // DOM references
        this.panel = document.getElementById('tile-detail-panel');
        this.statusBar = document.getElementById('selection-status');
        this.enrichedEl = document.getElementById('fp-enriched-detail');

        // Cable trace panel
        this.cableTracePanel = document.getElementById('cable-trace-panel');
        this.cableTraceContent = document.getElementById('cable-trace-content');
        this.cableTraceTitle = document.getElementById('cable-trace-title');

        // Rack elevation
        this.rackElevationPanel = document.getElementById('rack-elevation-panel');
        this.rackElevationSvg = document.getElementById('rack-elevation-svg');
        this.rackElevationLoading = document.getElementById('rack-elevation-loading');
        this.rackElevationTitle = document.getElementById('rack-elevation-title');
        this.rackFaceFrontBtn = document.getElementById('rack-face-front');
        this.rackFaceRearBtn = document.getElementById('rack-face-rear');
        this.currentRackId = null;
        this.currentRackFace = 'front';

        // Tape-robot panel
        this.roboterPanel = document.getElementById('roboter-panel');
        this.roboterTitle = document.getElementById('roboter-title');
        this.roboterMeta = document.getElementById('roboter-meta');
        this.roboterChart = document.getElementById('roboter-chart');
        this.roboterValues = document.getElementById('roboter-values');

        // Wire up events
        var self = this;
        events.on('tile:select', function(tile) { self.show(tile); });
        events.on('tile:deselect', function() { self.hide(); });
        events.on('tile:update', function(tile) {
            if (self.state.selectedTile && self.state.selectedTile.id === tile.id) {
                self.show(tile);
            }
        });
        events.on('ports:change', function(data) {
            if (self.state.selectedTile && data && data.tileId === self.state.selectedTile.id) {
                self._loadEnriched(self.state.selectedTile);
            }
        });

        this._bindRackFaceButtons();
    }

    // ─── Show / Hide ──────────────────────────────────────────────

    Detail.prototype.show = function(tile) {
        this._updateStatusBar(tile);
        this._updateDetailPanel(tile);
        this._loadEnriched(tile);
        this._updateRackElevation(tile);
        this._updateRoboter(tile);
    };

    Detail.prototype.hide = function() {
        if (this.panel) {
            this.panel.classList.add('d-none');
            this.panel.dataset.selectedTileId = '';
        }
        if (this.statusBar) {
            this.statusBar.innerHTML = '<span class="text-muted">Click a tile to select</span>';
        }
        var deleteBtn = document.getElementById('delete-tile-btn');
        if (deleteBtn) deleteBtn.disabled = true;
        if (this.enrichedEl) this.enrichedEl.innerHTML = '';
        if (this.cableTracePanel) this.cableTracePanel.classList.add('d-none');
        if (this.rackElevationPanel) this.rackElevationPanel.classList.add('d-none');
        if (this.roboterPanel) {
            this.roboterPanel.classList.add('d-none');
            if (this.roboterChart) this.roboterChart.innerHTML = '';
        }
        this.currentRackId = null;

        // Hide edit panels
        var fovPanel = document.getElementById('camera-fov-edit-panel');
        if (fovPanel) fovPanel.classList.add('d-none');
        var resizePanel = document.getElementById('resize-tile-panel');
        if (resizePanel) resizePanel.classList.add('d-none');
        var orientPanel = document.getElementById('orientation-tile-panel');
        if (orientPanel) orientPanel.classList.add('d-none');

        // Hide label editor
        var labelForm = document.getElementById('edit-label-form');
        if (labelForm) labelForm.classList.add('d-none');
    };

    // ─── Status Bar ───────────────────────────────────────────────

    Detail.prototype._updateStatusBar = function(tile) {
        if (!this.statusBar) return;
        var html = '<span class="text-muted">Selected</span> &nbsp;&triangleright;&nbsp; ';
        html += '<strong>' + (tile.label || tile.type) + '</strong>';
        html += ' &nbsp; <span class="text-muted">X,Y:</span> ' + tile.x + ', ' + tile.y;
        if (tile.w > 1 || tile.h > 1) {
            html += ' &nbsp; <span class="text-muted">Size:</span> ' + tile.w + '&times;' + tile.h;
        }
        if (tile.utilization !== null && tile.utilization !== undefined) {
            html += ' &nbsp; <span class="text-muted">Util:</span> ' + Math.round(tile.utilization) + '%';
        }
        if (tile.object_type) {
            html += ' &nbsp; <span class="text-muted">' + tile.object_type + ':</span> ';
            html += '<strong>' + (tile.object_name || '') + '</strong>';
        }
        if (tile.primary_ip) {
            html += ' &nbsp; <span class="text-muted">IP:</span> ' + tile.primary_ip;
        }
        if (tile.object_url) {
            html += ' &nbsp; <a href="' + tile.object_url + '" class="text-info">View &rarr;</a>';
        }
        this.statusBar.innerHTML = html;
    };

    // ─── Detail Panel ─────────────────────────────────────────────

    Detail.prototype._updateDetailPanel = function(tile) {
        if (!this.panel) return;

        // Hide label editor when switching tiles
        var labelForm = document.getElementById('edit-label-form');
        if (labelForm) labelForm.classList.add('d-none');

        this.panel.classList.remove('d-none');
        this.panel.dataset.selectedTileId = tile.id;

        var nameEl = document.getElementById('tile-detail-name');
        if (nameEl) nameEl.textContent = tile.label || '-';

        var posEl = document.getElementById('tile-detail-position');
        if (posEl) posEl.textContent = 'X: ' + tile.x + ', Y: ' + tile.y;

        var sizeEl = document.getElementById('tile-detail-size');
        if (sizeEl) sizeEl.textContent = tile.w + ' x ' + tile.h;

        var typeEl = document.getElementById('tile-detail-type');
        if (typeEl) typeEl.textContent = tile.type;

        var utilEl = document.getElementById('tile-detail-utilization');
        if (utilEl) {
            utilEl.textContent = (tile.utilization !== null && tile.utilization !== undefined)
                ? Math.round(tile.utilization) + '%' : '-';
        }

        var objectTypeEl = document.getElementById('tile-detail-object-type');
        if (objectTypeEl) objectTypeEl.textContent = tile.object_type || '-';

        var ipEl = document.getElementById('tile-detail-ip');
        var ipRow = document.getElementById('tile-detail-ip-row');
        if (ipEl) ipEl.textContent = tile.primary_ip || '-';
        if (ipRow) ipRow.style.display = tile.primary_ip ? '' : 'none';

        var objectLinkEl = document.getElementById('tile-detail-object-link');
        if (objectLinkEl) {
            if (tile.object_url) {
                objectLinkEl.innerHTML = '<a href="' + tile.object_url + '">' +
                    (tile.object_name || tile.object_type || 'Object') + '</a>';
            } else {
                objectLinkEl.textContent = '-';
            }
        }

        // Show linked floor plan info
        var fpLinkRow = document.getElementById('tile-detail-fplink-row');
        var fpLinkEl = document.getElementById('tile-detail-fplink');
        if (fpLinkRow && fpLinkEl) {
            if (tile.linked_floorplan_url && tile.linked_floorplan_name) {
                fpLinkRow.style.display = '';
                fpLinkEl.innerHTML = '<a href="' + tile.linked_floorplan_url + '">' +
                    tile.linked_floorplan_name + '</a>';
            } else {
                fpLinkRow.style.display = 'none';
                fpLinkEl.textContent = '-';
            }
        }

        // Show/hide camera FOV edit panel
        var fovPanel = document.getElementById('camera-fov-edit-panel');
        if (fovPanel) {
            if (tile.type === 'camera') {
                fovPanel.classList.remove('d-none');
                var dirInput = document.getElementById('edit-fov-direction');
                var angleInput = document.getElementById('edit-fov-angle');
                var distInput = document.getElementById('edit-fov-distance');
                var dirSlider = document.getElementById('edit-fov-direction-slider');
                var angleSlider = document.getElementById('edit-fov-angle-slider');
                var distSlider = document.getElementById('edit-fov-distance-slider');
                if (dirInput) dirInput.value = tile.fov_direction || 0;
                if (angleInput) angleInput.value = tile.fov_angle || 90;
                if (distInput) distInput.value = tile.fov_distance || 5;
                if (dirSlider) dirSlider.value = tile.fov_direction || 0;
                if (angleSlider) angleSlider.value = tile.fov_angle || 90;
                if (distSlider) distSlider.value = tile.fov_distance || 5;
            } else {
                fovPanel.classList.add('d-none');
            }
        }

        // Show resize panel in edit mode
        var resizePanel = document.getElementById('resize-tile-panel');
        if (resizePanel) {
            resizePanel.classList.remove('d-none');
            var resizeW = document.getElementById('resize-width-input');
            var resizeH = document.getElementById('resize-height-input');
            if (resizeW) resizeW.value = tile.w;
            if (resizeH) resizeH.value = tile.h;
        }

        // Show orientation panel in edit mode
        var orientPanel = document.getElementById('orientation-tile-panel');
        if (orientPanel) {
            orientPanel.classList.remove('d-none');
            var orientSel = document.getElementById('orientation-select');
            if (orientSel) orientSel.value = tile.orientation || 0;
        }

        var deleteBtn = document.getElementById('delete-tile-btn');
        if (deleteBtn) deleteBtn.disabled = false;
    };

    // ─── Enriched Detail (AJAX) ───────────────────────────────────

    Detail.prototype._loadEnriched = function(tile) {
        if (!this.enrichedEl) return;
        var self = this;
        var s = this.state;

        if (tile.type === 'drop' && tile.id) {
            // Drop tiles: fetch traces for all assigned ports
            this.enrichedEl.innerHTML = '<div class="sidebar-detail-loading">Loading port traces\u2026</div>';
            fetch(s.detailBaseUrl + 'drop/' + tile.id + '/', {
                credentials: 'same-origin',
                headers: { 'Accept': 'application/json' }
            })
            .then(function(r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            })
            .then(function(detail) {
                if (s.selectedTile !== tile) return;
                self.enrichedEl.innerHTML = '';
                self._renderCableTracePanel(detail.interfaces, tile);
            })
            .catch(function() {
                if (s.selectedTile === tile) self.enrichedEl.innerHTML = '';
            });
        } else if (tile.object_type_model && tile.object_id) {
            this.enrichedEl.innerHTML = '<div class="sidebar-detail-loading">Loading details\u2026</div>';
            fetch(s.detailBaseUrl + tile.object_type_model + '/' + tile.object_id + '/', {
                credentials: 'same-origin',
                headers: { 'Accept': 'application/json' }
            })
            .then(function(r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            })
            .then(function(detail) {
                if (s.selectedTile !== tile) return;
                var html = '';
                if (tile.object_type_model === 'device' && (tile.device_front_image || tile.device_back_image)) {
                    html += '<div class="sidebar-section-title">' + (tile.device_type ? App.escapeHtml(tile.device_type) : 'Equipment') + '</div>';
                    var imgs = '';
                    if (tile.device_front_image) {
                        imgs += '<img class="fp-device-image" src="' + tile.device_front_image + '" alt="front" title="front">';
                    }
                    if (tile.device_back_image) {
                        imgs += '<img class="fp-device-image" src="' + tile.device_back_image + '" alt="rear" title="rear">';
                    }
                    html += '<div class="fp-device-images">' + imgs + '</div>';
                }
                if (detail.mac_address) {
                    html += '<div class="sidebar-detail-list">';
                    html += '<div class="detail-row"><span class="detail-label">MAC</span>';
                    html += '<span class="detail-value"><code>' + detail.mac_address + '</code></span></div></div>';
                }
                if (detail.standard_fields && detail.standard_fields.length) {
                    html += '<div class="sidebar-section-title">Details</div>';
                    html += '<div class="sidebar-detail-list">';
                    for (var i = 0; i < detail.standard_fields.length; i++) {
                        var f = detail.standard_fields[i];
                        html += '<div class="detail-row"><span class="detail-label">' + f.label + '</span>';
                        html += '<span class="detail-value">' + f.value + '</span></div>';
                    }
                    html += '</div>';
                }
                if (detail.custom_fields && detail.custom_fields.length) {
                    html += '<div class="sidebar-section-title">Custom Fields</div>';
                    html += '<div class="sidebar-detail-list">';
                    for (var j = 0; j < detail.custom_fields.length; j++) {
                        var cf = detail.custom_fields[j];
                        html += '<div class="detail-row"><span class="detail-label">' + cf.label + '</span>';
                        html += '<span class="detail-value">' + cf.value + '</span></div>';
                    }
                    html += '</div>';
                }
                self.enrichedEl.innerHTML = html;
                self._renderCableTracePanel(detail.interfaces, tile);
            })
            .catch(function() {
                if (s.selectedTile === tile) self.enrichedEl.innerHTML = '';
            });
        } else {
            this.enrichedEl.innerHTML = '';
            if (this.cableTracePanel) this.cableTracePanel.classList.add('d-none');
        }
    };

    // ─── Cable Trace Panel ────────────────────────────────────────

    Detail.prototype._renderCableTracePanel = function(interfaces, tile) {
        if (!this.cableTracePanel || !this.cableTraceContent) return;

        if (!interfaces || interfaces.length === 0) {
            this.cableTracePanel.classList.add('d-none');
            return;
        }

        this.cableTracePanel.classList.remove('d-none');
        if (this.cableTraceTitle) {
            var model = tile.object_type_model;
            if (tile.type === 'drop') {
                this.cableTraceTitle.textContent = 'Drop Ports (' + interfaces.length + ')';
            } else if (model === 'rearport' || model === 'frontport') {
                this.cableTraceTitle.textContent = 'Cable Trace';
            } else {
                this.cableTraceTitle.textContent = 'Ports (' + interfaces.length + ')';
            }
        }

        this.cableTraceContent.innerHTML = App.generateTraceHTML(interfaces, 'main', this.state.deviceTileMap);

        // Attach collapse/expand and auto-collapse in the main sidebar panel
        App.attachTraceToggleListeners(this.cableTraceContent, 'main', true);
        // Attach "show on map" buttons
        this._attachMapButtonListeners(this.cableTraceContent);
    };

    Detail.prototype._attachMapButtonListeners = function(containerEl) {
        var self = this;
        var btns = containerEl.querySelectorAll('.ct-dev-map-btn');
        for (var i = 0; i < btns.length; i++) {
            btns[i].addEventListener('click', (function(btn) {
                return function(e) {
                    e.stopPropagation();
                    var tileId = parseInt(btn.dataset.tileId);
                    var tile = self.state.findTileById(tileId);
                    if (tile) {
                        self.state.selectTile(tile);
                        self.interaction.zoomToTile(tile);
                    }
                };
            })(btns[i]));
        }
    };

    // ─── Rack Elevation ───────────────────────────────────────────

    Detail.prototype._updateRackElevation = function(tile) {
        if (!this.rackElevationPanel) return;

        if (!tile || tile.object_type_model !== 'rack' || !tile.object_id) {
            this.rackElevationPanel.classList.add('d-none');
            this.currentRackId = null;
            return;
        }

        this.rackElevationPanel.classList.remove('d-none');

        if (this.rackElevationTitle) {
            this.rackElevationTitle.textContent = (tile.label || 'Rack') + ' \u2014 Elevation';
        }

        if (this.currentRackId !== tile.object_id) {
            this.currentRackId = tile.object_id;
            this.currentRackFace = 'front';
            if (this.rackFaceFrontBtn) this.rackFaceFrontBtn.classList.add('active');
            if (this.rackFaceRearBtn) this.rackFaceRearBtn.classList.remove('active');
            this._loadRackElevation(this.currentRackId, this.currentRackFace);
        }
    };

    Detail.prototype._loadRackElevation = function(rackId, face) {
        if (!this.rackElevationPanel || !this.rackElevationSvg) return;
        var self = this;

        if (this.rackElevationLoading) this.rackElevationLoading.classList.remove('d-none');
        this.rackElevationSvg.innerHTML = '';

        var url = '/plugins/map/rack-elevation/' + rackId + '/data/?face=' + face;

        fetch(url, { credentials: 'same-origin' })
        .then(function(response) {
            if (!response.ok) throw new Error('Failed to load rack elevation');
            return response.json();
        })
        .then(function(data) {
            if (self.rackElevationLoading) self.rackElevationLoading.classList.add('d-none');
            var svgText = App.RackElevation ? App.RackElevation.render(data) : '';
            self.rackElevationSvg.innerHTML = svgText;

            var svg = self.rackElevationSvg.querySelector('svg');
            if (svg) {
                svg.style.maxHeight = '75vh';
                svg.style.width = 'auto';
                svg.style.height = 'auto';
                svg.style.display = 'block';
                svg.style.margin = '0 auto';
            }
        })
        .catch(function(err) {
            if (self.rackElevationLoading) self.rackElevationLoading.classList.add('d-none');
            self.rackElevationSvg.innerHTML =
                '<div class="text-danger text-center py-3">Error loading rack elevation: ' +
                err.message + '</div>';
        });
    };

    Detail.prototype._bindRackFaceButtons = function() {
        var self = this;

        if (this.rackFaceFrontBtn) {
            this.rackFaceFrontBtn.addEventListener('click', function() {
                if (self.currentRackFace === 'front' || !self.currentRackId) return;
                self.currentRackFace = 'front';
                self.rackFaceFrontBtn.classList.add('active');
                self.rackFaceRearBtn.classList.remove('active');
                self._loadRackElevation(self.currentRackId, 'front');
            });
        }

        if (this.rackFaceRearBtn) {
            this.rackFaceRearBtn.addEventListener('click', function() {
                if (self.currentRackFace === 'rear' || !self.currentRackId) return;
                self.currentRackFace = 'rear';
                self.rackFaceRearBtn.classList.add('active');
                self.rackFaceFrontBtn.classList.remove('active');
                self._loadRackElevation(self.currentRackId, 'rear');
            });
        }
    };

    // ─── Tape Robot ──────────────────────────────────────────────

    Detail.prototype._updateRoboter = function(tile) {
        if (!this.roboterPanel) return;
        var r = (tile && tile.type === 'custom_roboter') ? (tile.roboter || null) : null;
        if (!r || !r.ok || !r.robots || !r.robots.length) {
            this.roboterPanel.classList.add('d-none');
            if (this.roboterChart) this.roboterChart.innerHTML = '';
            return;
        }
        this.roboterPanel.classList.remove('d-none');
        if (this.roboterTitle) this.roboterTitle.textContent = 'Tape Robot ' + (tile.label || '');
        if (this.roboterMeta) {
            var groups = {};
            (r.robots || []).forEach(function(b) {
                var model = [b.vendor, b.model].filter(function(x) { return x; }).join(' ') || 'Tape drive';
                if (!groups[model]) groups[model] = [];
                if (b.serial) groups[model].push(b.serial);
            });
            var metaParts = Object.keys(groups).map(function(m) {
                var html = '<strong>' + m + '</strong><br>';
                html += groups[m].map(function(sn) { return sn; }).join('<br>');
                return html;
            });
            this.roboterMeta.innerHTML = metaParts.join('<br>');
        }
        if (this.roboterChart) this.roboterChart.innerHTML = this._roboterSvg(r);
        if (this.roboterValues) {
            var lines = (r.robots || []).map(function(b, i) {
                var parts = [];
                if (b.serial) parts.push('<strong>' + (i + 1) + ':</strong> ' + b.serial);
                if (typeof b.temp === 'number') parts.push('<strong>T:</strong> ' + (Math.round(b.temp * 10) / 10) + '\u00b0C');
                if (typeof b.relhum === 'number') parts.push('<strong>RH:</strong> ' + (Math.round(b.relhum * 10) / 10) + '%');
                if (typeof b.temp === 'number' && typeof b.relhum === 'number') {
                    parts.push('<strong>x:</strong> ' + (Math.round(specHum(b.temp, b.relhum) * 10) / 10) + ' g/kg');
                }
                return parts.join(' &middot; ');
            });
            this.roboterValues.innerHTML = lines.join('<br>');
        }
    };

    // Specific humidity: g water per kg dry air (Mollier-style), from
    // temperature T [degC] and relative humidity phi [%].
    var PATM_HPA = 1013.25;  // atmospheric pressure (hPa)
    function psat(T) { return 6.112 * Math.exp(17.62 * T / (243.12 + T)); }
    function specHum(T, phi) {
        var pd = (phi / 100) * psat(T);
        return 0.622 * pd / (PATM_HPA - pd) * 1000;
    }

    Detail.prototype._roboterSvg = function(r) {
        var W = 260, H = 220, padL = 42, padB = 28, padT = 14, padR = 14;
        var TMIN = 15, TMAX = 35, XMAX = 30;
        var pw = W - padL - padR, ph = H - padT - padB;
        var px = function(T) { return padL + (T - TMIN) / (TMAX - TMIN) * pw; };
        var py = function(X) { return padT + (1 - X / XMAX) * ph; };
        function boxPts(coords) {
            return coords.map(function(p) {
                return px(p[0]).toFixed(1) + ',' + py(p[1]).toFixed(1);
            }).join(' ');
        }
        var s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;height:auto">';
        s += '<line x1="' + padL + '" y1="' + padT + '" x2="' + padL + '" y2="' + (H - padB) + '" stroke="#666"/>';
        s += '<line x1="' + padL + '" y1="' + (H - padB) + '" x2="' + (W - padR) + '" y2="' + (H - padB) + '" stroke="#666"/>';
        for (var xv = 0; xv <= XMAX; xv += 5) {
            var yy = py(xv);
            s += '<text x="' + (padL - 6) + '" y="' + (yy + 4) + '" font-size="8" fill="#888" text-anchor="end">' + xv + '</text>';
            s += '<line x1="' + padL + '" y1="' + yy + '" x2="' + (W - padR) + '" y2="' + yy + '" stroke="#eee"/>';
        }
        for (var tv = TMIN; tv <= TMAX; tv += 5) {
            var xx = px(tv);
            s += '<text x="' + xx + '" y="' + (H - padB + 12) + '" font-size="9" fill="#888" text-anchor="middle">' + tv + '</text>';
        }
        // Recommended Environment (green area):
        // vertices: (15,2.5) (15,5.5) (25,11.2) (25,4.2) [T in degC, x in g/kg]
        s += '<polygon points="' + boxPts([[15, 2.5], [15, 5.5], [25, 11.2], [25, 4.2]]) + '" fill="#2ecc71" fill-opacity="0.35" stroke="#27ae60" stroke-width="1.8"/>';
        // Allowable Environment (yellow/orange area):
        // vertices: (15,4.2) (15,8.2) (30,17.0) (35,17.0) (35,7.5)
        s += '<polygon points="' + boxPts([[15, 4.2], [15, 8.2], [30, 17.0], [35, 17.0], [35, 7.5]]) + '" fill="#f39c12" fill-opacity="0.35" stroke="#d68910" stroke-width="1.8"/>';
        s += '<text x="' + (padL + pw / 2) + '" y="' + (H - 4) + '" font-size="9" fill="#888" text-anchor="middle">Dry Bulb Temperature \u00b0C</text>';
        var midY = padT + (ph / 2);
        s += '<text x="13" y="' + midY + '" font-size="9" fill="#888" text-anchor="middle" transform="rotate(-90 13 ' + midY + ')">Specific Humidity (g/kg)</text>';
        s += '<rect x="' + (W - padR - 70) + '" y="' + (padT + 4) + '" width="10" height="10" fill="#f39c12" fill-opacity="0.4" stroke="#d68910" stroke-width="1.2"/>';
        s += '<text x="' + (W - padR - 56) + '" y="' + (padT + 13) + '" font-size="8" fill="#333">Allowable Environment</text>';
        s += '<rect x="' + (W - padR - 70) + '" y="' + (padT + 20) + '" width="10" height="10" fill="#2ecc71" fill-opacity="0.4" stroke="#27ae60" stroke-width="1.2"/>';
        s += '<text x="' + (W - padR - 56) + '" y="' + (padT + 29) + '" font-size="8" fill="#333">Recommended Environment</text>';
        // Numbered positions of the tape drives (1..n), matching the values list.
        (r.robots || []).forEach(function(b, i) {
            if (typeof b.temp !== 'number' || typeof b.relhum !== 'number') return;
            var T = Math.min(Math.max(b.temp, TMIN), TMAX);
            var X = Math.min(Math.max(specHum(b.temp, b.relhum), 0), XMAX);
            var cx = px(T).toFixed(1), cy = py(X).toFixed(1);
            s += '<circle cx="' + cx + '" cy="' + cy + '" r="6.5" fill="#2980b9" stroke="#fff" stroke-width="1.5"/>';
            s += '<text x="' + cx + '" y="' + (py(X) + 3).toFixed(1) + '" font-size="8.5" fill="#fff" text-anchor="middle" font-weight="bold">' + (i + 1) + '</text>';
        });
        s += '</svg>';
        return s;
    };

    App.Detail = Detail;

})(window.FloorplanApp);
