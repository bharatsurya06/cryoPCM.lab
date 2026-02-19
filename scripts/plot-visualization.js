/**
 * Plot visualization for CryoPCM-Lab interface.
 * Uses Plotly.js to draw property vs. temperature line charts.
 * Expects Plotly to be loaded globally (e.g. via CDN in the page).
 */

(function (global) {
    'use strict';

    /**
     * Draw a line chart of property vs. temperature in the given container.
     * Uses polynomial definitions loaded from CSV (property_data.csv).
     *
     * @param {string} containerId - ID of the DOM element (div) where the chart is drawn.
     * @param {string} propertyKey - Property identifier (matches the dropdown value).
     * @param {Array<Object>} propertyDefs - Array of definitions:
     *   { pcmId, name, propertyType, a, b, c, tmin, tmax }.
     * @param {string|null} selectedPcmId - Currently selected PCM ID.
     */
    function drawPropertyChart(containerId, propertyKey, propertyDefs, selectedPcmId) {
        var container = document.getElementById(containerId);
        if (!container) return;

        if (!selectedPcmId) {
            container.innerHTML = '<p class="chart-message">Select a PCM from the search results to see the property curve.</p>';
            return;
        }

        if (!propertyDefs || !propertyDefs.length) {
            container.innerHTML = '<p class="chart-message">No property data loaded from CSV. Check documentation/property_data.csv and ensure the page is served over HTTP (not file://).</p>';
            console.log('plot-visualization: propertyDefs is empty or not loaded');
            return;
        }

        // Find matching definition for selected PCM and property
        var matches = propertyDefs.filter(function (def) {
            return def.pcmId === selectedPcmId && def.propertyType === propertyKey;
        });

        if (!matches.length) {
            var availablePcms = propertyDefs.map(function(d) { return d.pcmId; }).filter(function(v, i, a) { return a.indexOf(v) === i; });
            var availableProps = propertyDefs.map(function(d) { return d.propertyType; }).filter(function(v, i, a) { return a.indexOf(v) === i; });
            container.innerHTML = '<p class="chart-message">No matching property definition found in CSV for PCM "' + selectedPcmId + '" and property "' + propertyKey + '".<br>Available PCMs in CSV: ' + (availablePcms.length ? availablePcms.join(', ') : 'none') + '<br>Available properties: ' + (availableProps.length ? availableProps.join(', ') : 'none') + '</p>';
            console.log('plot-visualization: No match found. Looking for pcmId="' + selectedPcmId + '", propertyType="' + propertyKey + '"');
            console.log('plot-visualization: Loaded propertyDefs:', propertyDefs);
            return;
        }

        var def = matches[0];
        var a = Number(def.a);
        var b = Number(def.b);
        var c = Number(def.c);
        var tmin = Number(def.tmin);
        var tmax = Number(def.tmax);

        if (!isFinite(a) || !isFinite(b) || !isFinite(c) || !isFinite(tmin) || !isFinite(tmax) || tmin >= tmax) {
            container.innerHTML = '<p class="chart-message">Property definition in CSV is incomplete or invalid.</p>';
            return;
        }

        var x = [];
        var y = [];
        for (var T = Math.round(tmin); T <= Math.round(tmax); T += 1) {
            var val = a * T * T + b * T + c;
            x.push(T);
            y.push(val);
        }

        var trace = {
            x: x,
            y: y,
            type: 'scatter',
            mode: 'lines+markers',
            name: selectedPcmId,
            line: { color: '#0b3d91', width: 2 },
            marker: { size: 8 }
        };

        var layout = {
            margin: { t: 24, r: 24, b: 48, l: 56 },
            xaxis: {
                title: 'Temperature (K)',
                zeroline: false,
                showgrid: true,
                gridcolor: '#e6ecf5'
            },
            yaxis: {
                title: 'Value',
                zeroline: false,
                showgrid: true,
                gridcolor: '#e6ecf5'
            },
            showlegend: false,
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            font: { family: 'Arial, Helvetica, sans-serif', size: 12 }
        };

        var config = {
            responsive: true,
            displayModeBar: true,
            displaylogo: false,
            modeBarButtonsToRemove: ['lasso2d', 'select2d']
        };

        if (typeof Plotly !== 'undefined') {
            Plotly.newPlot(containerId, [trace], layout, config);
        } else {
            container.innerHTML = '<p class="chart-message">Plotly.js is not loaded.</p>';
        }
    }

    global.drawPropertyChart = drawPropertyChart;
})(typeof window !== 'undefined' ? window : this);
