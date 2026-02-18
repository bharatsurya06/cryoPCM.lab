/**
 * Plot visualization for CryoPCM-Lab interface.
 * Uses Plotly.js to draw property vs. temperature line charts.
 * Expects Plotly to be loaded globally (e.g. via CDN in the page).
 */

(function (global) {
    'use strict';

    /**
     * Draw a line chart of property vs. temperature in the given container.
     * @param {string} containerId - ID of the DOM element (div) where the chart is drawn.
     * @param {string} propertyKey - Key in chartData (e.g. 'solid-specific-heat').
     * @param {Object} chartData - Object mapping property keys to arrays of { temperatureK, value }.
     * @param {string|null} selectedPcmId - Currently selected PCM ID; chart data is only for PCM-001.
     */
    function drawPropertyChart(containerId, propertyKey, chartData, selectedPcmId) {
        var container = document.getElementById(containerId);
        if (!container) return;

        // Chart data is defined only for PCM-001
        if (selectedPcmId && selectedPcmId !== 'PCM-001') {
            container.innerHTML = '<p class="chart-message">Dummy chart data is defined only for Dummy cryo-PCM A (PCM-001). Please select PCM-001 in the search results to see the curve.</p>';
            return;
        }

        if (!chartData || !chartData[propertyKey] || chartData[propertyKey].length === 0) {
            container.innerHTML = '<p class="chart-message">No chart data available.</p>';
            return;
        }

        var series = chartData[propertyKey];
        var x = series.map(function (p) { return p.temperatureK; });
        var y = series.map(function (p) { return p.value; });

        var trace = {
            x: x,
            y: y,
            type: 'scatter',
            mode: 'lines+markers',
            name: 'PCM-001',
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
