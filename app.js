// --- Initial State & Constants ---
const DEFAULT_EXERCISES = [
    { id: 'pushups', name: 'Push-ups', target: 100 },
    { id: 'situps', name: 'Sit-ups', target: 100 },
    { id: 'squats', name: 'Squats', target: 100 }
];

const DEFAULT_MEALS = [
    { name: "Porridge (40g oats, 1g salt, 220ml milk)", calories: 280, protein: 12, carbs: 42, fats: 6, satfat: 2.5 },
    { name: "1x Zinc & Magnesium tablet", calories: 0, protein: 0, carbs: 0, fats: 0, satfat: 0 },
    { name: "1x Vitamin D tablet", calories: 0, protein: 0, carbs: 0, fats: 0, satfat: 0 },
    { name: "1x Cod Liver Oil tablet", calories: 10, protein: 0, carbs: 0, fats: 1, satfat: 0.2 },
    { name: "2x Hard boiled eggs", calories: 140, protein: 12, carbs: 1, fats: 10, satfat: 3 },
    { name: "1x Banana", calories: 105, protein: 1.3, carbs: 27, fats: 0.3, satfat: 0.1 },
    { name: "1x 200g Protein yoghurt", calories: 140, protein: 20, carbs: 10, fats: 2, satfat: 1.2 },
    { name: "1x Apple", calories: 95, protein: 0.5, carbs: 25, fats: 0.3, satfat: 0.1 },
    { name: "1x Protein bar", calories: 200, protein: 20, carbs: 18, fats: 6, satfat: 3.5 },
    { name: "Protein powder (20g protein)", calories: 120, protein: 20, carbs: 3, fats: 1.5, satfat: 1 },
    { name: "3.4g Creatine powder", calories: 0, protein: 0, carbs: 0, fats: 0, satfat: 0 },
    { name: "Chilli (batch prepared portion)", calories: 450, protein: 35, carbs: 40, fats: 12, satfat: 4.5 },
    { name: "Rice (75g dry basmati)", calories: 270, protein: 6, carbs: 60, fats: 0.5, satfat: 0.1 }
].map((m, i) => ({ id: `meal_${i}`, ...m }));

// --- State Management ---
let state = {
    prefs: { heightUnit: 'ft', weightUnit: 'kg', fitnessGoal: 'maintain' },
    height: { cm: 180, ft: 5, in: 11 },
    targetWeight: 75,
    exercises: [...DEFAULT_EXERCISES],
    baseMeals: [...DEFAULT_MEALS],
    currentCycle: null,
    history: [],
    activeTab: 'status',
    penaltyActive: false,
    penaltyReps: 0,
    macroTargets: { calories: 2400, protein: 150, carbs: 240, fats: 75, satfat: 25 }
};

const STORAGE_KEY = 'the_system_state';

function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            state = { ...state, ...parsed };
            
            // Migrations/Sanitization
            if(!state.prefs) state.prefs = { heightUnit: 'ft', weightUnit: 'kg', fitnessGoal: 'maintain' };
            if(!state.prefs.fitnessGoal) state.prefs.fitnessGoal = 'maintain';
            if(typeof state.height === 'number') state.height = { cm: state.height, ft: 5, in: 11 };
            if(state.penaltyActive === undefined) state.penaltyActive = false;
            if(state.penaltyReps === undefined) state.penaltyReps = 0;
            if(state.targetWeight === undefined) state.targetWeight = 75;
            if(!state.activeTab) state.activeTab = 'status';
            
            if (!state.baseMeals || state.baseMeals.length === 6 || !state.baseMeals[0].hasOwnProperty('calories')) {
                state.baseMeals = [...DEFAULT_MEALS];
            }
            if(!state.macroTargets || !state.macroTargets.hasOwnProperty('satfat')) {
                recalculateMacroTargets();
            }
        } catch(e) {
            console.error("Failed to parse state", e);
        }
    } else {
        recalculateMacroTargets();
    }
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    render();
}

// --- Dynamic Macro Targets Generation ---
function recalculateMacroTargets() {
    let weightKg = state.targetWeight;
    if (state.prefs.weightUnit === 'lbs') {
        weightKg = state.targetWeight * 0.453592;
    }

    const protein = Math.round(weightKg * 2.0);
    const fats = Math.round(weightKg * 1.0);
    const satfat = Math.round(weightKg * 0.3);

    let calories = 2400;
    if (state.prefs.fitnessGoal === 'cut') {
        calories = Math.round(weightKg * 26);
    } else if (state.prefs.fitnessGoal === 'bulk') {
        calories = Math.round(weightKg * 38);
    } else {
        calories = Math.round(weightKg * 32);
    }

    const carbs = Math.round(Math.max(50, (calories - (protein * 4) - (fats * 9)) / 4));
    state.macroTargets = { calories, protein, carbs, fats, satfat };
}

// --- Custom Dialog System ---
function showSystemConfirm(text, onConfirm, onCancel) {
    const modal = document.getElementById('sys-modal');
    const modalText = document.getElementById('modal-text');
    const confirmBtn = document.getElementById('modal-btn-confirm');
    const cancelBtn = document.getElementById('modal-btn-cancel');
    const inputContainer = document.getElementById('modal-input-container');
    const title = document.getElementById('modal-title');
    
    title.innerHTML = "ⓘ ALARM";
    modalText.innerHTML = text;
    inputContainer.classList.add('hidden');
    cancelBtn.classList.remove('hidden');
    
    confirmBtn.innerText = "ACCEPT";
    cancelBtn.innerText = "DECLINE";
    
    modal.classList.remove('hidden');
    
    confirmBtn.onclick = () => {
        modal.classList.add('hidden');
        if (onConfirm) onConfirm();
    };
    cancelBtn.onclick = () => {
        modal.classList.add('hidden');
        if (onCancel) onCancel();
    };
}

function showSystemPrompt(text, defaultValue, onConfirm) {
    const modal = document.getElementById('sys-modal');
    const modalText = document.getElementById('modal-text');
    const confirmBtn = document.getElementById('modal-btn-confirm');
    const cancelBtn = document.getElementById('modal-btn-cancel');
    const inputContainer = document.getElementById('modal-input-container');
    const input = document.getElementById('modal-input');
    const title = document.getElementById('modal-title');
    
    title.innerHTML = "ⓘ SYSTEM INPUT";
    modalText.innerHTML = text;
    input.value = defaultValue || '';
    inputContainer.classList.remove('hidden');
    cancelBtn.classList.remove('hidden');
    
    confirmBtn.innerText = "SUBMIT";
    cancelBtn.innerText = "CANCEL";
    
    modal.classList.remove('hidden');
    input.focus();
    
    confirmBtn.onclick = () => {
        modal.classList.add('hidden');
        if (onConfirm) onConfirm(input.value);
    };
    cancelBtn.onclick = () => {
        modal.classList.add('hidden');
    };
}

// --- Cycle & Penalty Logic ---
function startCycle() {
    state.currentCycle = {
        id: Date.now(),
        startTime: new Date().toISOString(),
        exercises: {},
        meals: {},
        adHocMeals: [],
        weight: null
    };
    state.exercises.forEach(ex => { state.currentCycle.exercises[ex.id] = 0; });
    state.baseMeals.forEach(meal => { state.currentCycle.meals[meal.id] = false; });
    saveState();
}

function endCycle() {
    if (!state.currentCycle) return;
    
    let questFailed = false;

    state.exercises.forEach(ex => {
        const completed = state.currentCycle.exercises[ex.id] || 0;
        if (completed < ex.target) {
            questFailed = true;
        }
    });

    state.currentCycle.endTime = new Date().toISOString();
    state.currentCycle.completedQuest = !questFailed;
    state.history.push(state.currentCycle);
    state.currentCycle = null;

    if (questFailed) {
        state.penaltyActive = true;
        state.penaltyReps = 0;
    }
    
    saveState();
}

function addReps(exerciseId, amount) {
    if(!state.currentCycle) return;
    const current = state.currentCycle.exercises[exerciseId] || 0;
    state.currentCycle.exercises[exerciseId] = Math.max(0, current + amount);
    saveState();
}

// --- Penalty Controls ---
function addPenaltyReps(amount) {
    if (!state.penaltyActive) return;
    state.penaltyReps = Math.min(50, state.penaltyReps + amount);
    saveState();
}

function escapePenalty() {
    if (!state.penaltyActive || state.penaltyReps < 50) return;
    state.penaltyActive = false;
    state.penaltyReps = 0;
    saveState();
}

function toggleMeal(mealId) {
    if(!state.currentCycle) return;
    state.currentCycle.meals[mealId] = !state.currentCycle.meals[mealId];
    saveState();
}

window.appAddAdHocMeal = function(name) {
    if(!state.currentCycle) return;
    state.currentCycle.adHocMeals.push({ id: `adhoc_${Date.now()}`, name: name });
    saveState();
}

function setWeight(w) {
    if(!state.currentCycle) return;
    state.currentCycle.weight = parseFloat(w);
    saveState();
}

// --- Nutrition Calculators ---
function calculateCurrentMacros() {
    let totals = { calories: 0, protein: 0, carbs: 0, fats: 0, satfat: 0 };
    if (!state.currentCycle) return totals;

    state.baseMeals.forEach(meal => {
        if (state.currentCycle.meals[meal.id]) {
            totals.calories += meal.calories || 0;
            totals.protein += meal.protein || 0;
            totals.carbs += meal.carbs || 0;
            totals.fats += meal.fats || 0;
            totals.satfat += meal.satfat || 0;
        }
    });

    state.currentCycle.adHocMeals.forEach(meal => {
        totals.calories += meal.calories || 0;
        totals.protein += meal.protein || 0;
        totals.carbs += meal.carbs || 0;
        totals.fats += meal.fats || 0;
        totals.satfat += meal.satfat || 0;
    });

    totals.calories = Math.round(totals.calories);
    totals.protein = Math.round(totals.protein);
    totals.carbs = Math.round(totals.carbs);
    totals.fats = Math.round(totals.fats);
    totals.satfat = Math.round(totals.satfat);

    return totals;
}

// --- Adhoc Buff management ---
function addManualAdHoc(name, calories, protein, carbs, fats, satfat) {
    if (!state.currentCycle) return;
    state.currentCycle.adHocMeals.push({
        id: `adhoc_${Date.now()}`,
        name: name,
        calories: parseFloat(calories) || 0,
        protein: parseFloat(protein) || 0,
        carbs: parseFloat(carbs) || 0,
        fats: parseFloat(fats) || 0,
        satfat: parseFloat(satfat) || 0
    });
    saveState();
}

let activeEditAdhocId = null;
function openEditAdhoc(id) {
    if(!state.currentCycle) return;
    const meal = state.currentCycle.adHocMeals.find(m => m.id === id);
    if (!meal) return;

    activeEditAdhocId = id;
    document.getElementById('edit-adhoc-name').value = meal.name;
    document.getElementById('edit-adhoc-cal').value = meal.calories || '';
    document.getElementById('edit-adhoc-prot').value = meal.protein || '';
    document.getElementById('edit-adhoc-carb').value = meal.carbs || '';
    document.getElementById('edit-adhoc-fat').value = meal.fats || '';
    document.getElementById('edit-adhoc-satfat').value = meal.satfat || '';

    document.getElementById('edit-adhoc-modal').classList.remove('hidden');
}

// --- Open Food Facts Search logic ---
async function executeFoodSearch(query) {
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = '<p style="color:var(--sys-light-blue); text-align:center; padding:1rem;">Querying database...</p>';
    
    try {
        const res = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1`);
        const data = await res.json();
        
        if (!data.products || data.products.length === 0) {
            resultsContainer.innerHTML = '<p style="color:var(--sys-red); text-align:center; padding:1rem;">No results found.</p>';
            return;
        }

        resultsContainer.innerHTML = '';
        data.products.slice(0, 15).forEach(product => {
            const name = product.product_name || "Unknown Product";
            const brand = product.brands || "Generic";
            const nuts = product.nutriments || {};
            
            const cal = Math.round(nuts['energy-kcal_100g'] || 0);
            const prot = Math.round(nuts['proteins_100g'] || 0);
            const carb = Math.round(nuts['carbohydrates_100g'] || 0);
            const fat = Math.round(nuts['fat_100g'] || 0);
            const satfat = Math.round(nuts['saturated-fat_100g'] || 0);

            resultsContainer.innerHTML += `
                <div class="list-item" style="cursor:pointer;" onclick="window.app.selectSearchFood('${name.replace(/'/g, "\\'")}', ${cal}, ${prot}, ${carb}, ${fat}, ${satfat})">
                    <div style="flex-grow:1; padding-right:1rem;">
                        <span class="item-title" style="font-size:0.95rem;">${name}</span>
                        <span class="item-meta" style="font-size:0.8rem;">${brand} (Per 100g)</span>
                    </div>
                    <div style="text-align:right; font-size:0.85rem; color:var(--sys-light-blue); font-weight:bold;">
                        ${cal} kcal | P: ${prot}g<br>C: ${carb}g | F: ${fat}g
                    </div>
                </div>
            `;
        });
    } catch(err) {
        console.error(err);
        resultsContainer.innerHTML = '<p style="color:var(--sys-red); text-align:center; padding:1rem;">Scan failed. Check connectivity.</p>';
    }
}

// --- Tabs ---
function switchTab(tabId) {
    state.activeTab = tabId;
    render();
}

// --- UI Rendering ---
function render() {
    const viewPenalty = document.getElementById('view-penalty');
    const viewDashboard = document.getElementById('view-dashboard');
    
    if (state.penaltyActive) {
        viewPenalty.classList.remove('hidden');
        viewPenalty.classList.add('active');
        
        viewDashboard.classList.add('hidden');
        viewDashboard.classList.remove('active');
        
        document.getElementById('penalty-reps').innerText = state.penaltyReps;
        const btnEscape = document.getElementById('btn-escape-penalty');
        btnEscape.disabled = state.penaltyReps < 50;
        return;
    } else {
        viewPenalty.classList.add('hidden');
        viewPenalty.classList.remove('active');
        
        viewDashboard.classList.remove('hidden');
        viewDashboard.classList.add('active');
    }

    const inCycle = !!state.currentCycle;
    
    // Toggle active tab content visibility
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`tab-${state.activeTab}`).classList.remove('hidden');
    document.querySelector(`.nav-btn[data-tab="${state.activeTab}"]`).classList.add('active');

    // Keep settings configurations rendered and sync'd on active tabs
    renderSettings();

    // --- Tab 1: Status Tab ---
    const cycleTitle = document.getElementById('cycle-title');
    const toggleBtn = document.getElementById('btn-cycle-toggle');
    const cycleWarning = document.getElementById('cycle-warning');
    const cycleSummary = document.getElementById('cycle-summary');

    if (inCycle) {
        cycleTitle.innerHTML = "DAILY <span class='highlight-green'>QUEST</span> IN PROGRESS";
        cycleTitle.style.color = "var(--sys-light-blue)";
        toggleBtn.innerText = "COMPLETE QUEST (SLEEP)";
        toggleBtn.className = "btn danger";
        cycleWarning.innerHTML = "(WARNING: FAILURE TO COMPLETE DAILY QUESTS WILL RESULT IN APPROPRIATE <span class='highlight-red'>PENALTY</span>.)";
        cycleWarning.classList.remove('hidden');
        cycleSummary.classList.remove('hidden');

        let completedTraining = 0;
        state.exercises.forEach(ex => {
            const completed = state.currentCycle.exercises[ex.id] || 0;
            if (completed >= ex.target) completedTraining++;
        });

        const currentMacros = calculateCurrentMacros();

        document.getElementById('sum-training').innerText = `[ ${completedTraining} / ${state.exercises.length} MET ]`;
        document.getElementById('sum-sustenance').innerText = `[ ${currentMacros.calories} / ${state.macroTargets.calories} kcal ]`;
    } else {
        cycleTitle.innerHTML = "DAILY <span class='highlight-green'>QUEST</span> HAS ARRIVED";
        cycleTitle.style.color = "var(--sys-light-blue)";
        toggleBtn.innerText = "ACCEPT QUEST";
        toggleBtn.className = "btn primary";
        cycleWarning.classList.add('hidden');
        cycleSummary.classList.add('hidden');
    }

    // --- Tab 2: Training Tab ---
    const exList = document.getElementById('exercise-list');
    if (!inCycle) {
        exList.innerHTML = `
            <div class="sys-panel text-center" style="border-color:var(--sys-red); box-shadow:0 0 15px var(--sys-red-glow);">
                <div class="title-box danger" style="margin-bottom:1rem;"><h3>SYSTEM LOCKED</h3></div>
                <p class="penalty-desc" style="color:var(--sys-light-blue);">Accept the Daily Quest from the STATUS tab to initialize log.</p>
            </div>
        `;
    } else {
        exList.innerHTML = '';
        const checkSvg = `<svg viewBox="0 0 20 20" fill="none" stroke="#4ade80" stroke-width="3" stroke-linecap="square" stroke-linejoin="miter"><polyline points="3,10.5 7.5,15 16.5,4.5"/></svg>`;
        state.exercises.forEach(ex => {
            const reps = state.currentCycle.exercises[ex.id] || 0;
            const target = ex.target;
            const isComplete = reps >= target;
            
            exList.innerHTML += `
                <div class="exercise-row ${isComplete ? 'complete' : ''}">
                    <div class="exercise-main">
                        <div class="exercise-title-group">
                            <span class="exercise-name">${ex.name}</span>
                        </div>
                        <div class="exercise-status-group">
                            <span class="exercise-count">[ ${reps} / ${target} ]</span>
                            <div class="quest-box ${isComplete ? 'checked' : ''}">${isComplete ? checkSvg : ''}</div>
                        </div>
                    </div>
                    <div class="exercise-controls">
                        <button onclick="window.app.addReps('${ex.id}', -10)">-10</button>
                        <button onclick="window.app.addReps('${ex.id}', -1)">-1</button>
                        <button onclick="window.app.addReps('${ex.id}', 1)">+1</button>
                        <button onclick="window.app.addReps('${ex.id}', 10)">+10</button>
                    </div>
                </div>
            `;
        });
    }

    // --- Tab 3: Sustenance Tab ---
    const mealList = document.getElementById('meal-list');
    const macroCard = document.getElementById('macro-status-card');
    const btnAddAdHoc = document.getElementById('btn-add-adhoc-meal');
    const btnSearchFood = document.getElementById('btn-search-food');

    if (!inCycle) {
        macroCard.classList.add('hidden');
        mealList.innerHTML = `
            <div class="sys-panel text-center" style="border-color:var(--sys-red); box-shadow:0 0 15px var(--sys-red-glow);">
                <div class="title-box danger" style="margin-bottom:1rem;"><h3>SYSTEM LOCKED</h3></div>
                <p class="penalty-desc" style="color:var(--sys-light-blue);">Accept the Daily Quest from the STATUS tab to initialize log.</p>
            </div>
        `;
        btnAddAdHoc.disabled = true;
        btnSearchFood.disabled = true;
    } else {
        macroCard.classList.remove('hidden');
        btnAddAdHoc.disabled = false;
        btnSearchFood.disabled = false;

        const currentMacros = calculateCurrentMacros();
        document.getElementById('curr-calories').innerText = `[ ${currentMacros.calories} / ${state.macroTargets.calories} kcal ]`;
        document.getElementById('curr-protein').innerText = `[ ${currentMacros.protein} / ${state.macroTargets.protein} g ]`;
        document.getElementById('curr-carbs').innerText = `[ ${currentMacros.carbs} / ${state.macroTargets.carbs} g ]`;
        document.getElementById('curr-fats').innerText = `[ ${currentMacros.fats} / ${state.macroTargets.fats} g ]`;
        document.getElementById('curr-satfats').innerText = `[ ${currentMacros.satfat} / ${state.macroTargets.satfat} g ]`;

        const updateCardColor = (elementId, current, target, isLimit = false) => {
            const card = document.getElementById(elementId).parentElement;
            card.classList.remove('clr-ok', 'clr-warn', 'clr-danger', 'clr-success');
            
            const ratio = target > 0 ? (current / target) : 0;
            
            if (isLimit) {
                if (ratio >= 1.0) {
                    card.classList.add('clr-danger');
                } else if (ratio >= 0.75) {
                    card.classList.add('clr-warn');
                } else if (ratio >= 0.5) {
                    card.classList.add('clr-ok');
                } else {
                    card.classList.add('clr-success');
                }
            } else {
                if (ratio > 1.30) {
                    card.classList.add('clr-danger');
                } else if (ratio > 1.15) {
                    card.classList.add('clr-ok');
                } else if (ratio >= 0.75) {
                    card.classList.add('clr-success');
                } else if (ratio >= 0.5) {
                    card.classList.add('clr-warn');
                } else {
                    card.classList.add('clr-danger');
                }
            }
        };

        updateCardColor('curr-calories', currentMacros.calories, state.macroTargets.calories);
        updateCardColor('curr-protein', currentMacros.protein, state.macroTargets.protein);
        updateCardColor('curr-carbs', currentMacros.carbs, state.macroTargets.carbs);
        updateCardColor('curr-fats', currentMacros.fats, state.macroTargets.fats);
        updateCardColor('curr-satfats', currentMacros.satfat, state.macroTargets.satfat, true);

        // Render Meals list
        mealList.innerHTML = '';
        state.baseMeals.forEach(meal => {
            const isDone = state.currentCycle.meals[meal.id];
            mealList.innerHTML += `
                <div class="list-item" style="opacity: ${isDone ? '0.5' : '1'}; transition: opacity 0.2s;" onclick="window.app.toggleMeal('${meal.id}')">
                    <span class="item-title" style="font-size: 0.95rem;">${meal.name}</span>
                    <input type="checkbox" class="checkbox" ${isDone ? 'checked' : ''}>
                </div>
            `;
        });
        
        if(state.currentCycle.adHocMeals && state.currentCycle.adHocMeals.length > 0) {
            mealList.innerHTML += `<div style="margin-top: 1rem; color: var(--sys-light-blue); font-size: 0.8rem; text-transform: uppercase; font-weight: bold;">Temporary Additions (Tap to Edit)</div>`;
            state.currentCycle.adHocMeals.forEach(meal => {
                mealList.innerHTML += `
                    <div class="list-item" style="cursor:pointer;" onclick="window.app.editAdhocMeal('${meal.id}')">
                        <div style="flex-grow:1;">
                            <span class="item-title" style="font-size: 0.95rem; color: var(--text-muted);">${meal.name}</span>
                            <span class="item-meta" style="font-size:0.8rem;">${meal.calories || 0} kcal | P: ${meal.protein || 0}g</span>
                        </div>
                        <span class="item-meta">Ad-hoc ⚙️</span>
                    </div>
                `;
            });
        }
    }

    // --- Tab 4: Stats Tab ---
    const weightInput = document.getElementById('input-weight');
    document.getElementById('lbl-weight-unit').innerText = state.prefs.weightUnit;
    
    if (!inCycle) {
        weightInput.value = '';
        weightInput.disabled = true;
        document.getElementById('display-bmi').innerText = '--';
    } else {
        weightInput.disabled = false;
        if (state.currentCycle.weight !== null && weightInput.value != state.currentCycle.weight) {
            weightInput.value = state.currentCycle.weight;
        }
        const bmi = calculateBMI(state.currentCycle.weight, getHeightInCm());
        document.getElementById('display-bmi').innerText = bmi || '--';
    }
}

function renderSettings() {
    document.getElementById('pref-height-unit').value = state.prefs.heightUnit;
    document.getElementById('pref-weight-unit').value = state.prefs.weightUnit;
    document.getElementById('pref-fitness-goal').value = state.prefs.fitnessGoal || 'maintain';
    document.getElementById('setting-target-weight').value = state.targetWeight || '';

    document.getElementById('pref-target-weight-unit').innerText = state.prefs.weightUnit;
    
    const isFt = state.prefs.heightUnit === 'ft';
    document.getElementById('setting-height-cm-group').classList.toggle('hidden', isFt);
    document.getElementById('setting-height-ft-group').classList.toggle('hidden', !isFt);
    
    document.getElementById('setting-height-cm').value = state.height.cm || '';
    document.getElementById('setting-height-ft').value = state.height.ft || '';
    document.getElementById('setting-height-in').value = state.height.in || '';
    
    const exList = document.getElementById('settings-exercise-list');
    exList.innerHTML = '';
    state.exercises.forEach(ex => {
        exList.innerHTML += `
            <div class="list-item">
                <span class="item-title">${ex.name}</span>
                <input type="number" style="width: 80px;" value="${ex.target}" onchange="window.app.updateExTarget('${ex.id}', this.value)">
            </div>
        `;
    });

    const mealList = document.getElementById('settings-meal-list');
    if (mealList) {
        mealList.innerHTML = '';
        state.baseMeals.forEach(meal => {
            mealList.innerHTML += `
                <div class="list-item" style="display:flex; flex-direction:column; align-items:stretch; gap: 0.5rem; padding: 1.5rem 0;">
                    <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                        <input type="text" value="${meal.name}" onchange="window.app.updateBaseMeal('${meal.id}', 'name', this.value)" style="flex-grow:1; margin-right:1rem; font-size: 1.1rem; border:none; border-bottom:1px dashed rgba(255,255,255,0.2); padding:0.25rem 0;">
                        <button class="btn btn-sub danger" style="padding:0.4rem 0.6rem; border-radius:4px; font-weight:bold; width: 40px; margin-top:0;" onclick="window.app.removeBaseMeal('${meal.id}')">✕</button>
                    </div>
                    <div class="settings-meal-macros" style="display:flex; gap: 6px; flex-wrap:wrap; width:100%;">
                        <div style="flex:1; min-width:80px;"><label style="font-size:0.75rem; color:var(--sys-light-blue);">KCAL</label><input type="number" value="${meal.calories || 0}" onchange="window.app.updateBaseMeal('${meal.id}', 'calories', this.value)"></div>
                        <div style="flex:1; min-width:80px;"><label style="font-size:0.75rem; color:var(--sys-light-blue);">PROT</label><input type="number" value="${meal.protein || 0}" onchange="window.app.updateBaseMeal('${meal.id}', 'protein', this.value)"></div>
                        <div style="flex:1; min-width:80px;"><label style="font-size:0.75rem; color:var(--sys-light-blue);">CARB</label><input type="number" value="${meal.carbs || 0}" onchange="window.app.updateBaseMeal('${meal.id}', 'carbs', this.value)"></div>
                        <div style="flex:1; min-width:80px;"><label style="font-size:0.75rem; color:var(--sys-light-blue);">FAT</label><input type="number" value="${meal.fats || 0}" onchange="window.app.updateBaseMeal('${meal.id}', 'fats', this.value)"></div>
                        <div style="flex:1; min-width:80px;"><label style="font-size:0.75rem; color:var(--sys-light-blue);">SAT</label><input type="number" value="${meal.satfat || 0}" onchange="window.app.updateBaseMeal('${meal.id}', 'satfat', this.value)"></div>
                    </div>
                </div>
            `;
        });
    }
}

// --- Setup ---
window.app = {
    addReps,
    addPenaltyReps,
    escapePenalty,
    toggleMeal,
    switchTab,
    updateExTarget: (id, val) => {
        const ex = state.exercises.find(e => e.id === id);
        if(ex) {
            ex.target = parseInt(val, 10);
            saveState();
        }
    },
    updatePref: (key, val) => {
        state.prefs[key] = val;
        recalculateMacroTargets();
        saveState();
    },
    updateHeight: (key, val) => {
        state.height[key] = parseFloat(val) || 0;
        saveState();
    },
    updateTargetWeight: (val) => {
        state.targetWeight = parseFloat(val) || 75;
        recalculateMacroTargets();
        saveState();
    },
    updateBaseMeal: (id, field, val) => {
        const meal = state.baseMeals.find(m => m.id === id);
        if (meal) {
            if (field === 'name') {
                meal.name = val;
            } else {
                meal[field] = parseFloat(val) || 0;
            }
            saveState();
        }
    },
    addBaseMeal: (name) => {
        state.baseMeals.push({ id: `meal_${Date.now()}`, name: name, calories:0, protein:0, carbs:0, fats:0, satfat:0 });
        saveState();
    },
    removeBaseMeal: (id) => {
        state.baseMeals = state.baseMeals.filter(m => m.id !== id);
        saveState();
    },
    editAdhocMeal: (id) => {
        openEditAdhoc(id);
    },
    selectSearchFood: (name, cal, prot, carb, fat, satfat) => {
        addManualAdHoc(name, cal, prot, carb, fat, satfat);
        document.getElementById('search-modal').classList.add('hidden');
    },
    removeAdHocMeal: (id) => {
        if(!state.currentCycle) return;
        state.currentCycle.adHocMeals = state.currentCycle.adHocMeals.filter(m => m.id !== id);
        saveState();
    },
    bypassPenaltyAdmin: () => {
        state.penaltyActive = false;
        state.penaltyReps = 0;
        saveState();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    loadState();

    document.getElementById('btn-cycle-toggle').onclick = () => {
        if (state.currentCycle) {
            showSystemConfirm(
                "[End quest and proceed to sleep? (Unfinished tasks will trigger a <span class='highlight-red'>SURVIVAL PENALTY</span>!)]",
                () => { endCycle(); }
            );
        } else {
            startCycle();
        }
    };

    document.getElementById('input-weight').addEventListener('change', (e) => {
        if(e.target.value) {
            setWeight(e.target.value);
            render();
        }
    });

    document.getElementById('btn-add-adhoc-meal').onclick = () => {
        showSystemPrompt("[Enter <span class='highlight-green'>TEMPORARY BUFF</span> description:]", "", (name) => {
            if (name) {
                addManualAdHoc(name, 0, 0, 0, 0, 0);
                const newMeal = state.currentCycle.adHocMeals[state.currentCycle.adHocMeals.length - 1];
                openEditAdhoc(newMeal.id);
            }
        });
    };

    document.getElementById('btn-search-food').onclick = () => {
        document.getElementById('input-search-query').value = '';
        document.getElementById('search-results').innerHTML = '<p style="color:var(--sys-light-blue); text-align:center; padding:1rem;">Submit a query to scan database...</p>';
        document.getElementById('search-modal').classList.remove('hidden');
    };
    document.getElementById('btn-close-search').onclick = () => {
        document.getElementById('search-modal').classList.add('hidden');
    };
    document.getElementById('btn-exec-search').onclick = () => {
        const query = document.getElementById('input-search-query').value;
        if(query) executeFoodSearch(query);
    };

    document.getElementById('btn-save-adhoc-edit').onclick = () => {
        if(!state.currentCycle || !activeEditAdhocId) return;
        const meal = state.currentCycle.adHocMeals.find(m => m.id === activeEditAdhocId);
        if (meal) {
            meal.name = document.getElementById('edit-adhoc-name').value;
            meal.calories = parseFloat(document.getElementById('edit-adhoc-cal').value) || 0;
            meal.protein = parseFloat(document.getElementById('edit-adhoc-prot').value) || 0;
            meal.carbs = parseFloat(document.getElementById('edit-adhoc-carb').value) || 0;
            meal.fats = parseFloat(document.getElementById('edit-adhoc-fat').value) || 0;
            meal.satfat = parseFloat(document.getElementById('edit-adhoc-satfat').value) || 0;
            
            saveState();
        }
        document.getElementById('edit-adhoc-modal').classList.add('hidden');
        activeEditAdhocId = null;
    };
    
    document.getElementById('btn-cancel-adhoc-edit').onclick = () => {
        document.getElementById('edit-adhoc-modal').classList.add('hidden');
        activeEditAdhocId = null;
    };

    document.getElementById('btn-delete-adhoc').onclick = () => {
        if(!state.currentCycle || !activeEditAdhocId) return;
        showSystemConfirm("[Are you sure you want to remove this <span class='highlight-red'>TEMPORARY BUFF</span>?]", () => {
            window.app.removeAdHocMeal(activeEditAdhocId);
            document.getElementById('edit-adhoc-modal').classList.add('hidden');
            activeEditAdhocId = null;
        });
    };

    document.getElementById('btn-settings-add-meal').onclick = () => {
        showSystemPrompt("[Enter new <span class='highlight-yellow'>SUSTENANCE ITEM</span> description:]", "", (name) => {
            if (name) window.app.addBaseMeal(name);
        });
    };

    // Settings Drawers Toggle logic
    const setupToggle = (btnId, panelId, defaultText) => {
        const btn = document.getElementById(btnId);
        const panel = document.getElementById(panelId);
        if (btn && panel) {
            btn.onclick = () => {
                const isHidden = panel.classList.contains('hidden');
                if (isHidden) {
                    panel.classList.remove('hidden');
                    btn.innerText = "[ CLOSE PREFERENCES ]";
                } else {
                    panel.classList.add('hidden');
                    btn.innerText = defaultText;
                }
            };
        }
    };

    setupToggle('btn-toggle-training-settings', 'panel-training-settings', '[ CONFIGURE TRAINING ]');
    setupToggle('btn-toggle-meals-settings', 'panel-meals-settings', '[ CONFIGURE SUSTENANCE ]');
    setupToggle('btn-toggle-vitals-settings', 'panel-vitals-settings', '[ CONFIGURE PROFILE ]');

    render();
});
