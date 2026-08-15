// Set current year in footer
document.getElementById('year').textContent = new Date().getFullYear();

// # logic for pcm search and display

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
            obj[h] = values[j];
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



function drawChart(pcmId) {
    if (!pcmId) {
        clearAllCharts();
        return;
    }

    const jsonPath = `rawdata/${pcmId}.json`;
    
    fetch(jsonPath)
        .then(response => {
            if (!response.ok) throw new Error('Failed to load PCM data');
            return response.json();
        })
        .then(data => {
            const properties = data.properties;
            const propertyKeys = ['solid_density', 'liquid_density', 'solid_thermal_conductivity', 'liquid_thermal_conductivity', 'solid_specific_heat', 'liquid_specific_heat'];
            
            propertyKeys.forEach(key => {
                const prop = properties[key];
                if (prop) {
                    plotProperty(key, prop);
                }
            });
        })
        .catch(error => {
            console.error('Error loading PCM data:', error);
            clearAllCharts();
        });
}

function plotProperty(propertyKey, propertyData) {

    const formattedKey = propertyKey.replace(/_/g, '-');
    const chartId = `plot-${formattedKey}`; 

    // const chartId = `plot-${propertyKey}`;
    const chartElement = document.getElementById(chartId);
    if (!chartElement) {
        console.warn(`Chart element not found: ${chartId}`);
        return;
    }

    console.log(`Plotting ${propertyKey}:`, propertyData);

    const temperatures = propertyData.data.map(d => d.T);
    const values = propertyData.data.map(d => d.val);

    console.log(`Temperatures: ${temperatures}, Values: ${values}`);

    const trace = {
        x: temperatures,
        y: values,
        type: 'scatter',
        mode: 'lines+markers',
        name: propertyData.displayName,
        line: { 
            color: '#1f77b4', 
            width: 2 
        },
        marker: { 
            size: 8,
            color: '#1f77b4'
        }
    };

    const layout = {
        title: {
            text: propertyData.displayName,
            font: { size: 14 }
        },
        xaxis: {
            title: `Temperature (${propertyData.units.temperature})`,
            showgrid: true,
            zeroline: false
        },
        yaxis: {
            title: `${propertyData.symbol} (${propertyData.units.value})`,
            showgrid: true,
            zeroline: false
        },
        margin: { t: 50, r: 30, b: 50, l: 70 },
        plot_bgcolor: '#fafbff',
        paper_bgcolor: '#ffffff'
        
    };

    const config = {
        responsive: true,
        displayModeBar: false
    };

    // Clear any existing plot first
    Plotly.purge(chartId);
    
    // Set the element height explicitly to match CSS
    chartElement.style.height = '400px';
    
    // Create the plot
    Plotly.newPlot(chartId, [trace], layout, config);
}

function clearAllCharts() {
    const chartIds = ['plot-solid-density', 'plot-liquid-density', 'plot-solid-thermal-conductivity', 'plot-liquid-thermal-conductivity', 'plot-solid-specific-heat', 'plot-liquid-specific-heat'];
    
    chartIds.forEach(chartId => {
        const element = document.getElementById(chartId);
        if (element) {
            Plotly.purge(chartId);
            element.innerHTML = '';
        }
    });
}

function updateSearchStatus(message) {
    const statusEl = document.getElementById('search-status');
    if (statusEl) {
        statusEl.textContent = message;
    }
}

function populateResultsList(filtered) {
    const listContainer = document.getElementById('materials-list');
    listContainer.innerHTML = '';

    if (!filtered || filtered.length === 0) {
        const noMaterialsMsg = document.createElement('p');
        noMaterialsMsg.className = 'no-materials';
        noMaterialsMsg.textContent = 'No materials found';
        listContainer.appendChild(noMaterialsMsg);
        return;
    }

    filtered.forEach(pcm => {
        const item = document.createElement('div');
        item.className = 'material-item';
        item.dataset.id = pcm.id;
        
        const idEl = document.createElement('div');
        idEl.className = 'material-id';
        idEl.textContent = pcm.id;
        
        const nameEl = document.createElement('div');
        nameEl.className = 'material-name';
        nameEl.textContent = pcm.name;
        
        item.appendChild(idEl);
        item.appendChild(nameEl);
        
        item.addEventListener('click', function() {
            selectMaterial(pcm.id, filtered);
        });
        
        listContainer.appendChild(item);
    });
}

function selectMaterial(id, filtered) {
    // Update active state in list
    const allItems = document.querySelectorAll('.material-item');
    allItems.forEach(item => {
        item.classList.remove('active');
    });
    
    const activeItem = document.querySelector(`.material-item[data-id="${id}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
    }
    
    // Find and display PCM details
    const pcm = filtered.find(p => p.id === id);
    if (pcm) {
        updateSelectedPcmDetails(pcm);
        drawChart(pcm.id);
    }
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
        meltingEl.textContent = pcm.meltingPointK || '–';
    }
    if (boilingEl) {
        boilingEl.textContent = pcm.boilingPointK || '–';
    }
    if (latentEl) {
        latentEl.textContent = pcm.latentHeat || '–';
    }
    if (flashEl) {
        flashEl.textContent = pcm.flashPointK || '–';
    }
    if (safetyEl) {
        safetyEl.textContent = pcm.safetyRating || '–';
    }
    if (costEl) {
        costEl.textContent = pcm.cost || '–';
    }
}

function applyFilters() {
    const tmin = parseFloat(document.getElementById('tmin').value);
    const tmax = parseFloat(document.getElementById('tmax').value);
    const rangeEntered = !isNaN(tmin) && !isNaN(tmax) && tmin <= tmax;

    let filtered = pcms.filter(pcm => {
        // Temperature range filter: melting point within [tmin, tmax], boiling point above tmax
        if (rangeEntered) {
            const melting = parseFloat(pcm.meltingPointK);
            const boiling = parseFloat(pcm.boilingPointK);
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
        populateResultsList([]);
        updateSelectedPcmDetails(null);
        clearAllCharts();
    } else {
        updateSearchStatus(`Search completed: ${filtered.length} PCM(s) found.`);
        populateResultsList(filtered);
        // Default to the first result
        selectMaterial(filtered[0].id, filtered);
    }
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
        populateResultsList(lastFiltered);
        if (lastFiltered.length > 0) {
            selectMaterial(lastFiltered[0].id, lastFiltered);
        } else {
            updateSelectedPcmDetails(null);
            clearAllCharts();
        }
    }, 0);
});

// Load PCM data (CSV) and property data (CSV), then run initial render
Promise.all([loadPcms(), loadPropertyData()]).then(function () {
    updateSearchStatus(lastFiltered.length > 0 ? 'Showing all PCMs (no filters applied yet).' : 'No PCM data loaded. Check rawdata/pcms.csv.');
    populateResultsList(lastFiltered);
    if (lastFiltered.length > 0) {
        selectMaterial(lastFiltered[0].id, lastFiltered);
    } else {
        updateSelectedPcmDetails(null);
        clearAllCharts();
    }
});
