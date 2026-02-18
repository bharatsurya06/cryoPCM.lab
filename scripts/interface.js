// Set current year in footer
document.getElementById('year').textContent = new Date().getFullYear();

let pcms = [];
let lastFiltered = [];

const numericPcmFields = ['tmin', 'tmax', 'latentHeat', 'meltingPointK', 'boilingPointK', 'flashPointK', 'cost'];

function parsePcmsCsv(csvText) {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const obj = {};
        headers.forEach((h, j) => {
            obj[h] = numericPcmFields.indexOf(h) >= 0 ? parseFloat(values[j]) : (values[j] || '');
        });
        rows.push(obj);
    }
    return rows;
}

function loadPcms() {
    return fetch('rawdata/pcms.csv')
        .then(response => response.text())
        .then(text => {
            pcms = parsePcmsCsv(text);
            lastFiltered = pcms.slice();
        })
        .catch(() => {
            pcms = [];
            lastFiltered = [];
        });
}

// Property definitions for polynomial property(T) = a*T^2 + b*T + c
// Loaded from documentation/property_data.csv
let propertyDefs = [];

function parsePropertyDataCsv(csvText) {
    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const rows = [];
    // Skip header (line 0), parse remaining lines by fixed column order:
    // 0: pcmId, 1: name, 2: propertyType, 3: a, 4: b, 5: c, 6: tmin, 7: tmax
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (!values[0]) continue;
        rows.push({
            pcmId: values[0],
            name: values[1],
            propertyType: values[2],
            a: parseFloat(values[3]),
            b: parseFloat(values[4]),
            c: parseFloat(values[5]),
            tmin: parseFloat(values[6]),
            tmax: parseFloat(values[7])
        });
    }
    return rows;
}

function loadPropertyData() {
    return fetch('documentation/property_data.csv')
        .then(response => response.text())
        .then(text => {
            propertyDefs = parsePropertyDataCsv(text);
        })
        .catch(() => {
            propertyDefs = [];
        });
}

function getSelectedPropertyKey() {
    return document.getElementById('property-select').value;
}

function updateSearchStatus(message) {
    const statusEl = document.getElementById('search-status');
    if (statusEl) {
        statusEl.textContent = message;
    }
}

function populateResultsDropdown(filtered) {
    const select = document.getElementById('result-select');
    select.innerHTML = '';

    if (!filtered || filtered.length === 0) {
        select.disabled = true;
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'No results';
        select.appendChild(opt);
        return;
    }

    select.disabled = false;

    filtered.forEach(pcm => {
        const opt = document.createElement('option');
        opt.value = pcm.id;
        opt.textContent = `${pcm.id} — ${pcm.name}`;
        select.appendChild(opt);
    });
}

function findPcmById(id) {
    return lastFiltered.find(pcm => pcm.id === id) || null;
}

function updateSelectedPcmDetails(pcm) {
    const nameEl = document.getElementById('selected-pcm-name');
    const meltingEl = document.getElementById('prop-melting-point');
    const boilingEl = document.getElementById('prop-boiling-point');
    const latentEl = document.getElementById('prop-latent-heat');
    const flashEl = document.getElementById('prop-flash-point');
    const safetyEl = document.getElementById('prop-safety-rating');
    const costEl = document.getElementById('prop-cost');

    if (!pcm) {
        if (nameEl) nameEl.textContent = 'No PCM selected.';
        if (meltingEl) meltingEl.textContent = '–';
        if (boilingEl) boilingEl.textContent = '–';
        if (latentEl) latentEl.textContent = '–';
        if (flashEl) flashEl.textContent = '–';
        if (safetyEl) safetyEl.textContent = '–';
        if (costEl) costEl.textContent = '–';
        return;
    }

    if (nameEl) {
        nameEl.textContent = `${pcm.id} — ${pcm.name}`;
    }
    if (meltingEl) {
        meltingEl.textContent = `${pcm.meltingPointK.toFixed(1)} K`;
    }
    if (boilingEl) {
        boilingEl.textContent = `${pcm.boilingPointK.toFixed(1)} K`;
    }
    if (latentEl) {
        latentEl.textContent = `${pcm.latentHeat.toFixed(1)} kJ/kg`;
    }
    if (flashEl) {
        flashEl.textContent = `${pcm.flashPointK.toFixed(1)} K`;
    }
    if (safetyEl) {
        safetyEl.textContent = pcm.safetyRating;
    }
    if (costEl) {
        costEl.textContent = `${pcm.cost.toFixed(2)} (relative units)`;
    }
}

function drawChart(propertyKey) {
    const selectedIdEl = document.getElementById('result-select');
    const selectedPcmId = selectedIdEl ? selectedIdEl.value : null;
    if (typeof drawPropertyChart === 'function') {
        drawPropertyChart('property-chart', propertyKey, propertyDefs, selectedPcmId);
    }
}

function applyFilters() {
    const tmin = parseFloat(document.getElementById('tmin').value);
    const tmax = parseFloat(document.getElementById('tmax').value);
    const rangeEntered = !isNaN(tmin) && !isNaN(tmax) && tmin <= tmax;

    let filtered = pcms.filter(pcm => {
        // Temperature range filter: melting point within [tmin, tmax], boiling point above tmax
        if (rangeEntered) {
            const melting = Number(pcm.meltingPointK);
            const boiling = Number(pcm.boilingPointK);
            if (isNaN(melting) || melting < tmin || melting > tmax) {
                return false;
            }
            if (isNaN(boiling) || boiling <= tmax) {
                return false;
            }
        }
        return true;
    });

    lastFiltered = filtered;

    if (filtered.length === 0) {
        updateSearchStatus('Search completed: no matching PCMs.');
        populateResultsDropdown([]);
        updateSelectedPcmDetails(null);
    } else {
        updateSearchStatus(`Search completed: ${filtered.length} PCM(s) found.`);
        populateResultsDropdown(filtered);
        // Default to the first result
        updateSelectedPcmDetails(filtered[0]);
        document.getElementById('result-select').value = filtered[0].id;
    }

    const propertyKey = getSelectedPropertyKey();
    drawChart(propertyKey);
}

// Event wiring
document.getElementById('pcm-filters-form').addEventListener('submit', function (evt) {
    evt.preventDefault();
    applyFilters();
});

document.getElementById('pcm-filters-form').addEventListener('reset', function () {
    // Allow the reset to clear inputs, then re-apply with all data
    setTimeout(() => {
        lastFiltered = pcms.slice();
        updateSearchStatus('Filters reset: showing all PCMs.');
        populateResultsDropdown(lastFiltered);
        if (lastFiltered.length > 0) {
            updateSelectedPcmDetails(lastFiltered[0]);
            document.getElementById('result-select').value = lastFiltered[0].id;
        } else {
            updateSelectedPcmDetails(null);
        }
        const propertyKey = getSelectedPropertyKey();
        drawChart(propertyKey);
    }, 0);
});

document.getElementById('property-select').addEventListener('change', function () {
    const propertyKey = getSelectedPropertyKey();
    drawChart(propertyKey);
});

document.getElementById('result-select').addEventListener('change', function () {
    const id = this.value;
    const pcm = findPcmById(id);
    updateSelectedPcmDetails(pcm);
    drawChart(getSelectedPropertyKey());
});

// Load PCM data (CSV) and property data (CSV), then run initial render
Promise.all([loadPcms(), loadPropertyData()]).then(function () {
    updateSearchStatus(lastFiltered.length > 0 ? 'Showing all PCMs (no filters applied yet).' : 'No PCM data loaded. Check rawdata/pcms.csv.');
    populateResultsDropdown(lastFiltered);
    if (lastFiltered.length > 0) {
        updateSelectedPcmDetails(lastFiltered[0]);
        document.getElementById('result-select').value = lastFiltered[0].id;
    } else {
        updateSelectedPcmDetails(null);
    }
    drawChart(getSelectedPropertyKey());
});
