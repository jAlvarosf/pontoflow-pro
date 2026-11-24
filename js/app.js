/**
 * PontoFlow - Controlador Principal da Aplicação
 * Lógica de Interface, Relógio, Áudio, Câmera, Acesso Restrito do RH e Modais
 */

class PontoApp {
    constructor() {
        this.isRh = db.isRhAuthenticated();
        this.currentUser = db.getCurrentUser();
        this.currentTab = 'bater-ponto';
        this.stream = null;
        this.audioCtx = null;
        this.timesheetYearMonth = this.getInitialYearMonth();
        this.chartInstance = null;
        this.currentPendingDelete = null; // { type: 'punch' | 'employee', id: '...' }

        // Elementos principais do DOM
        this.dom = {
            clockTime: document.getElementById('clock-time'),
            clockSeconds: document.getElementById('clock-seconds'),
            clockDate: document.getElementById('clock-date'),
            todaySummaryList: document.getElementById('today-summary-list'),
            todayPunchesCount: document.getElementById('today-punches-count'),
            videoPreview: document.getElementById('camera-feed'),
            cameraContainer: document.getElementById('camera-container'),
            cameraFallback: document.getElementById('camera-fallback'),
            captureCanvas: document.getElementById('capture-canvas'),
            punchReceiptModal: document.getElementById('punch-receipt-modal'),
            receiptContent: document.getElementById('receipt-content'),
            timesheetMonthInput: document.getElementById('timesheet-month-input'),
            timesheetTableBody: document.getElementById('timesheet-table-body'),
            toastContainer: document.getElementById('toast-container'),
            totemModal: document.getElementById('totem-modal'),
            largeEmployeeGrid: document.getElementById('large-employee-grid'),
            empSearchInput: document.getElementById('emp-search-input'),
            punchDetailsModal: document.getElementById('punch-details-modal'),
            editPunchModal: document.getElementById('edit-punch-modal'),
            dayPunchesModal: document.getElementById('day-punches-modal'),
            viewEmployeeModal: document.getElementById('view-employee-modal'),
            editEmployeeModal: document.getElementById('edit-employee-modal'),
            confirmModal: document.getElementById('confirm-modal'),
            rhLoginModal: document.getElementById('rh-login-modal'),
            rhNavigationTabs: document.getElementById('rh-navigation-tabs'),
            rhLoggedInBox: document.getElementById('rh-logged-in-box'),
            rhLoggedOutBox: document.getElementById('rh-logged-out-box'),
            rhUserDisplayName: document.getElementById('rh-user-display-name')
        };

        this.init();
    }

    getInitialYearMonth() {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}`;
    }

    init() {
        this.setupAudio();
        this.startClock();
        this.setupEventListeners();
        this.updateRhUiVisibility();
        this.setupCamera();
        this.renderLargeEmployeeGrid();
        this.renderTodayDashboard();
        this.renderTimesheet();
        this.renderRequests();
        this.renderAdminDashboard();
    }

    // ============================================================
    // 1. ÁUDIO SINTETIZADO (Web Audio API)
    // ============================================================
    setupAudio() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.audioCtx = new AudioContext();
            }
        } catch (e) {
            console.warn('Web Audio API não suportada.');
        }
    }

    playSuccessSound() {
        if (!this.audioCtx) return;
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }

        const now = this.audioCtx.currentTime;
        const freqs = [523.25, 659.25, 783.99, 1046.50];

        freqs.forEach((freq, idx) => {
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + (idx * 0.08));

            gain.gain.setValueAtTime(0.001, now + (idx * 0.08));
            gain.gain.exponentialRampToValueAtTime(0.18, now + (idx * 0.08) + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + (idx * 0.08) + 0.35);

            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            osc.start(now + (idx * 0.08));
            osc.stop(now + (idx * 0.08) + 0.4);
        });
    }

    playWarningSound() {
        if (!this.audioCtx) return;
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }

        const now = this.audioCtx.currentTime;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.setValueAtTime(240, now + 0.15);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start(now);
        osc.stop(now + 0.4);
    }

    // ============================================================
    // 2. RELÓGIO DIGITAL EM TEMPO REAL
    // ============================================================
    startClock() {
        const update = () => {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');

            if (this.dom.clockTime) {
                this.dom.clockTime.textContent = `${hours}:${minutes}`;
            }
            if (this.dom.clockSeconds) {
                this.dom.clockSeconds.textContent = `:${seconds}`;
            }

            if (this.dom.clockDate) {
                const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                const formattedDate = now.toLocaleDateString('pt-BR', options);
                this.dom.clockDate.textContent = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
            }
        };

        update();
        setInterval(update, 1000);
    }

    // ============================================================
    // 3. CONTROLE DE ACESSO DO RH / ADMINISTRADOR
    // ============================================================
    updateRhUiVisibility() {
        const isRh = this.isRh;

        if (this.dom.rhNavigationTabs) {
            if (isRh) {
                this.dom.rhNavigationTabs.classList.remove('hidden');
                this.dom.rhNavigationTabs.classList.add('flex');
            } else {
                this.dom.rhNavigationTabs.classList.add('hidden');
                this.dom.rhNavigationTabs.classList.remove('flex');
            }
        }

        if (this.dom.rhLoggedInBox && this.dom.rhLoggedOutBox) {
            if (isRh) {
                this.dom.rhLoggedInBox.classList.remove('hidden');
                this.dom.rhLoggedInBox.classList.add('flex');
                this.dom.rhLoggedOutBox.classList.add('hidden');
                const rhUser = db.getRhUser();
                if (this.dom.rhUserDisplayName) {
                    this.dom.rhUserDisplayName.textContent = rhUser ? rhUser.name.split(' ')[0] : 'RH';
                }
            } else {
                this.dom.rhLoggedInBox.classList.add('hidden');
                this.dom.rhLoggedInBox.classList.remove('flex');
                this.dom.rhLoggedOutBox.classList.remove('hidden');
            }
        }

        // Se deslogado do RH e estiver em aba restrita, volta para Bater Ponto
        if (!isRh && this.currentTab !== 'bater-ponto') {
            this.switchTab('bater-ponto');
        }

        const mobileRhBtn = document.getElementById('mobile-rh-btn');
        if (mobileRhBtn) {
            mobileRhBtn.innerHTML = isRh 
                ? '<i class="fa-solid fa-right-from-bracket text-base text-rose-400"></i> Sair RH'
                : '<i class="fa-solid fa-lock text-base"></i> Acesso RH';
        }
    }

    openRhLoginModal() {
        const errorEl = document.getElementById('rh-login-error');
        const pinInput = document.getElementById('rh-login-pin');
        if (errorEl) errorEl.classList.add('hidden');
        if (pinInput) {
            pinInput.value = '';
            setTimeout(() => pinInput.focus(), 150);
        }
        if (this.dom.rhLoginModal) {
            this.dom.rhLoginModal.classList.remove('hidden');
        }
    }

    closeRhLoginModal() {
        if (this.dom.rhLoginModal) {
            this.dom.rhLoginModal.classList.add('hidden');
        }
    }

    handleRhLogin(e) {
        e.preventDefault();
        const pin = document.getElementById('rh-login-pin').value.trim();
        const rhUser = db.verifyRhCredentials(pin);

        if (rhUser) {
            this.isRh = true;
            db.setRhAuthenticated(true, rhUser);
            this.playSuccessSound();
            this.showToast(`Acesso liberado para: ${rhUser.name}`, 'success');
            this.closeRhLoginModal();
            this.updateRhUiVisibility();
            this.renderLargeEmployeeGrid();
            this.renderTodayDashboard();
            this.renderAdminDashboard();
        } else {
            this.playWarningSound();
            const errorEl = document.getElementById('rh-login-error');
            if (errorEl) errorEl.classList.remove('hidden');
        }
    }

    logoutRh() {
        this.isRh = false;
        db.setRhAuthenticated(false);
        this.showToast('Sessão do RH finalizada', 'info');
        this.updateRhUiVisibility();
        this.renderLargeEmployeeGrid();
        this.renderTodayDashboard();
    }

    toggleMobileRh() {
        if (this.isRh) {
            this.logoutRh();
        } else {
            this.openRhLoginModal();
        }
    }

    // ============================================================
    // 4. CÂMERA & RECONHECIMENTO FACIAL
    // ============================================================
    async setupCamera() {
        if (!this.dom.videoPreview) return;

        try {
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                this.stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
                    audio: false
                });
                this.dom.videoPreview.srcObject = this.stream;
                this.dom.videoPreview.classList.remove('hidden');
                if (this.dom.cameraFallback) this.dom.cameraFallback.classList.add('hidden');
            } else {
                this.activateCameraFallback();
            }
        } catch (err) {
            this.activateCameraFallback();
        }
    }

    activateCameraFallback() {
        if (this.dom.videoPreview) this.dom.videoPreview.classList.add('hidden');
        if (this.dom.cameraFallback) this.dom.cameraFallback.classList.remove('hidden');
    }

    triggerCameraFlash() {
        if (!this.dom.cameraContainer) return;
        const flash = document.createElement('div');
        flash.className = 'camera-flash';
        this.dom.cameraContainer.appendChild(flash);
        setTimeout(() => flash.remove(), 400);
    }

    captureSnapshot() {
        this.triggerCameraFlash();

        if (this.stream && this.dom.videoPreview && !this.dom.videoPreview.classList.contains('hidden')) {
            const canvas = this.dom.captureCanvas || document.createElement('canvas');
            canvas.width = 400;
            canvas.height = 300;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(this.dom.videoPreview, 0, 0, canvas.width, canvas.height);
            return canvas.toDataURL('image/jpeg', 0.88);
        }

        return this.currentUser ? this.currentUser.photoUrl : null;
    }

    // ============================================================
    // 5. LISTA / GRID DE COLABORADORES COM FOTO E REGISTRO IMEDIATO
    // ============================================================
    renderLargeEmployeeGrid(filterText = '') {
        const container = this.dom.largeEmployeeGrid;
        if (!container) return;

        let employees = db.getEmployees();
        const search = (filterText || (this.dom.empSearchInput ? this.dom.empSearchInput.value : '')).toLowerCase().trim();

        if (search) {
            employees = employees.filter(e => 
                e.name.toLowerCase().includes(search) || 
                e.role.toLowerCase().includes(search) || 
                e.registrationNumber.toLowerCase().includes(search) ||
                e.department.toLowerCase().includes(search)
            );
        }

        if (employees.length === 0) {
            container.innerHTML = `
                <div class="col-span-full py-8 text-center text-slate-500">
                    <i class="fa-solid fa-user-slash text-3xl mb-2"></i>
                    <p class="text-xs">Nenhum colaborador encontrado com "${search}".</p>
                </div>
            `;
            return;
        }

        const todayStr = db.formatDate(new Date());
        const allPunches = db.getAllPunches();

        container.innerHTML = employees.map(emp => {
            const isCurrent = this.currentUser && this.currentUser.id === emp.id;
            const todayPunches = allPunches.filter(p => p.employeeId === emp.id && p.dateStr === todayStr)
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            let statusClass = 'avatar-status-out';
            let statusBadge = '<span class="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">Fora</span>';

            if (todayPunches.length > 0) {
                const last = todayPunches[todayPunches.length - 1];
                if (last.type === 'entrada' || last.type === 'retorno_intervalo' || last.type === 'entrada_extra') {
                    statusClass = 'avatar-status-working';
                    statusBadge = `<span class="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 font-bold">Trabalhando (${last.timeStr.slice(0,5)})</span>`;
                } else if (last.type === 'saida_intervalo') {
                    statusClass = 'avatar-status-lunch';
                    statusBadge = `<span class="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 font-bold">Em Almoço</span>`;
                } else if (last.type === 'saida') {
                    statusClass = 'avatar-status-out';
                    statusBadge = `<span class="text-[10px] text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/30">Expediente Fim</span>`;
                }
            }

            const nextPunchType = db.getNextPunchType(emp.id);
            const nextPunchLabels = {
                'entrada': 'Entrada',
                'saida_intervalo': 'Saída Almoço',
                'retorno_intervalo': 'Volta Almoço',
                'saida': 'Saída',
                'entrada_extra': 'Hora Extra'
            };

            // Ações extras de perfil apenas para o RH autenticado
            const rhActionsHtml = this.isRh ? `
                <div class="flex gap-1.5 w-full pt-1 border-t border-slate-800">
                    <button onclick="app.openViewEmployeeModal('${emp.id}')" class="flex-1 py-1 text-[10px] bg-slate-800 hover:bg-slate-700 text-blue-300 rounded-lg border border-slate-700 transition" title="Visualizar Perfil Completo">
                        <i class="fa-solid fa-eye"></i> Perfil
                    </button>
                    <button onclick="app.openEditEmployeeModal('${emp.id}')" class="flex-1 py-1 text-[10px] bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg border border-slate-700 transition" title="Editar Dados e Foto">
                        <i class="fa-solid fa-user-pen"></i> Editar
                    </button>
                </div>
            ` : '';

            return `
                <div class="emp-selection-card ${isCurrent ? 'is-active-emp' : 'bg-slate-950/70 border-slate-800'} border rounded-2xl p-4 flex flex-col items-center text-center justify-between group shadow-lg">
                    <!-- Topo do Card -->
                    <div class="w-full flex justify-between items-center mb-2">
                        <span class="text-[10px] font-mono text-slate-400">${emp.registrationNumber}</span>
                        ${statusBadge}
                    </div>

                    <!-- Foto Grande com Anel de Status -->
                    <div class="relative mb-2 cursor-pointer" onclick="app.selectAndPunchEmployee('${emp.id}')">
                        <div class="avatar-status-ring ${statusClass}">
                            <img src="${emp.photoUrl}" alt="${emp.name}" class="w-20 h-20 rounded-full object-cover border-2 ${isCurrent ? 'border-blue-400' : 'border-slate-700'} shadow-md group-hover:scale-105 transition-transform">
                        </div>
                    </div>

                    <!-- Nome & Cargo -->
                    <div class="mb-3 cursor-pointer w-full" onclick="app.selectAndPunchEmployee('${emp.id}')">
                        <h3 class="text-xs font-bold text-slate-100 group-hover:text-blue-300 transition line-clamp-1">${emp.name}</h3>
                        <p class="text-[10px] text-slate-400 line-clamp-1">${emp.role}</p>
                    </div>

                    <!-- Botão de Bater Ponto com Foto Imediata -->
                    <div class="w-full space-y-2">
                        <button onclick="app.selectAndPunchEmployee('${emp.id}')" class="w-full py-2.5 px-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 active:scale-95" title="Bater ponto agora com captura de foto">
                            <i class="fa-solid fa-camera"></i>
                            <span>Bater ${nextPunchLabels[nextPunchType]}</span>
                        </button>

                        ${rhActionsHtml}
                    </div>
                </div>
            `;
        }).join('');
    }

    selectAndPunchEmployee(empId) {
        const emp = db.getEmployeeById(empId);
        if (!emp) return;

        this.currentUser = emp;
        db.setCurrentUser(emp.id);

        const punchType = db.getNextPunchType(emp.id);
        const photoData = this.captureSnapshot();

        try {
            const punch = db.registerPunch({
                employeeId: emp.id,
                type: punchType,
                photoUrl: photoData,
                notes: 'Registro via painel de colaboradores'
            });

            this.playSuccessSound();
            this.showToast(`Ponto registrado com foto para: ${emp.name}! (NSR: ${punch.nsr})`, 'success');

            this.renderTodayDashboard();
            this.renderLargeEmployeeGrid();
            this.renderTimesheet();
            this.renderAdminDashboard();

            this.showReceiptModal(punch);

        } catch (err) {
            this.playWarningSound();
            this.showToast(`Erro ao registrar: ${err.message}`, 'error');
        }
    }

    // ============================================================
    // 6. COMPROVANTE OFICIAL DE PONTO
    // ============================================================
    showReceiptModal(punch) {
        const emp = db.getEmployeeById(punch.employeeId) || this.currentUser;

        const typeLabels = {
            'entrada': 'ENTRADA (INÍCIO DE JORNADA)',
            'saida_intervalo': 'SAÍDA PARA INTERVALO / REFEIÇÃO',
            'retorno_intervalo': 'RETORNO DE INTERVALO / REFEIÇÃO',
            'saida': 'SAÍDA (FIM DE JORNADA)',
            'entrada_extra': 'ENTRADA DE HORAS EXTRAS'
        };

        const punchDate = new Date(punch.timestamp);
        const formattedDate = punchDate.toLocaleDateString('pt-BR');
        const formattedTime = punch.timeStr;

        const html = `
            <div class="receipt-paper p-6 rounded-lg text-slate-800 text-xs leading-relaxed max-w-md mx-auto border border-slate-300">
                <div class="text-center pb-3 border-b border-dashed border-slate-400">
                    <p class="font-extrabold text-sm tracking-wide text-slate-900">PONTOFLOW</p>
                    <div class="mt-2 py-1 px-2 bg-slate-100 rounded text-slate-700 font-bold tracking-wider text-[11px] border border-slate-300">
                        COMPROVANTE DE REGISTRO DE PONTO DO TRABALHADOR
                    </div>
                    <p class="text-[9px] text-slate-400 mt-1">Conforme Portaria MTE 671/2021</p>
                </div>

                <div class="py-3 border-b border-dashed border-slate-400 flex items-center gap-3">
                    <img src="${punch.photoUrl || emp.photoUrl}" class="w-16 h-16 rounded-full object-cover border-2 border-slate-400 shadow-sm" alt="Foto no Ponto">
                    <div class="flex-1 space-y-0.5">
                        <div class="flex justify-between">
                            <span class="font-bold text-slate-600">NSR:</span>
                            <span class="font-extrabold text-blue-800 text-sm">${String(punch.nsr).padStart(6, '0')}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="font-bold text-slate-600">Colaborador:</span>
                            <span class="font-semibold text-slate-900">${emp.name}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="font-bold text-slate-600">CPF:</span>
                            <span>${emp.cpf}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="font-bold text-slate-600">Matrícula:</span>
                            <span>${emp.registrationNumber}</span>
                        </div>
                    </div>
                </div>

                <div class="py-3 border-b border-dashed border-slate-400 bg-blue-50/50 p-2 my-2 rounded">
                    <div class="flex justify-between items-center">
                        <span class="font-bold text-slate-700">TIPO DE BATIDA:</span>
                        <span class="font-black text-blue-900 text-xs">${typeLabels[punch.type] || punch.type.toUpperCase()}</span>
                    </div>
                    <div class="flex justify-between mt-1 text-sm">
                        <span class="font-bold text-slate-800">DATA / HORA:</span>
                        <span class="font-extrabold text-slate-900">${formattedDate} às ${formattedTime}</span>
                    </div>
                </div>

                <div class="pt-2 text-[9px] text-slate-500 break-all space-y-1">
                    <div>
                        <span class="font-bold text-slate-700">Assinatura Digital (SHA-256):</span>
                        <p class="font-mono text-[8.5px] text-slate-600 bg-slate-100 p-1 rounded mt-0.5">${punch.hashSha256}</p>
                    </div>
                    <p class="text-center text-[8px] text-slate-400 pt-1">
                        Garantia legal de registro de ponto do trabalhador.
                    </p>
                </div>
            </div>
        `;

        if (this.dom.receiptContent) {
            this.dom.receiptContent.innerHTML = html;
        }

        if (this.dom.punchReceiptModal) {
            this.dom.punchReceiptModal.classList.remove('hidden');
        }
    }

    closeReceiptModal() {
        if (this.dom.punchReceiptModal) {
            this.dom.punchReceiptModal.classList.add('hidden');
        }
    }

    printReceipt() {
        window.print();
    }

    // ============================================================
    // 7. VISUALIZAR, EDITAR E EXCLUIR BATIDAS (RESTRITO AO RH)
    // ============================================================
    showPunchDetails(punchIdOrNsr) {
        if (!this.isRh) {
            this.showToast('Apenas o responsável do RH pode visualizar detalhes avançados', 'warning');
            return;
        }

        const punch = db.getPunchById(punchIdOrNsr);
        if (!punch) return;

        const emp = db.getEmployeeById(punch.employeeId);
        const body = document.getElementById('punch-details-body');
        const actions = document.getElementById('punch-details-actions');

        const typeLabels = {
            'entrada': 'Entrada (Início de Jornada)',
            'saida_intervalo': 'Saída Intervalo / Almoço',
            'retorno_intervalo': 'Retorno Intervalo / Almoço',
            'saida': 'Saída (Fim de Jornada)',
            'entrada_extra': 'Entrada de Hora Extra'
        };

        if (body) {
            body.innerHTML = `
                <div class="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-950 rounded-2xl border border-slate-800">
                    <img src="${punch.photoUrl || (emp ? emp.photoUrl : '')}" class="w-24 h-24 rounded-2xl object-cover border-2 border-blue-500 shadow-md bg-slate-900" alt="Foto">
                    <div class="space-y-1 text-xs flex-1 text-center sm:text-left">
                        <div class="flex justify-between items-center flex-wrap">
                            <span class="font-bold text-white text-sm">${emp ? emp.name : punch.employeeName}</span>
                            <span class="font-mono text-blue-400 font-bold">NSR: ${String(punch.nsr).padStart(6, '0')}</span>
                        </div>
                        <p class="text-slate-400 font-semibold">${typeLabels[punch.type] || punch.type}</p>
                        <p class="text-slate-200 font-mono text-sm font-bold">${punch.dateStr} às ${punch.timeStr}</p>
                        ${punch.notes ? `<p class="text-[11px] text-amber-300 bg-amber-950/40 p-1.5 rounded border border-amber-800/40"><strong>Obs:</strong> ${punch.notes}</p>` : ''}
                        ${punch.isEdited ? `<p class="text-[10px] text-amber-400 font-semibold"><i class="fa-solid fa-pen"></i> Registro Editado pelo RH</p>` : ''}
                    </div>
                </div>

                <div class="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[10px] text-slate-400 break-all space-y-1">
                    <span class="font-bold text-slate-300 block">Assinatura Digital SHA-256:</span>
                    <span class="font-mono text-slate-500 block">${punch.hashSha256}</span>
                </div>
            `;
        }

        if (actions) {
            actions.innerHTML = `
                <button onclick="app.confirmDeletePunch('${punch.id}')" class="py-2 px-3 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 rounded-xl border border-rose-500/30 text-xs font-bold transition flex items-center gap-1.5">
                    <i class="fa-solid fa-trash"></i> Excluir
                </button>
                <button onclick="app.openEditPunchModal('${punch.id}')" class="py-2 px-3 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 rounded-xl border border-amber-500/30 text-xs font-bold transition flex items-center gap-1.5">
                    <i class="fa-solid fa-pen-to-square"></i> Editar
                </button>
                <button onclick="app.showReceiptModalByNsr(${punch.nsr})" class="py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow">
                    <i class="fa-solid fa-receipt"></i> Comprovante
                </button>
            `;
        }

        if (this.dom.punchDetailsModal) {
            this.dom.punchDetailsModal.classList.remove('hidden');
        }
    }

    closePunchDetailsModal() {
        if (this.dom.punchDetailsModal) {
            this.dom.punchDetailsModal.classList.add('hidden');
        }
    }

    openEditPunchModal(punchIdOrNsr) {
        if (!this.isRh) {
            this.showToast('Apenas o responsável do RH pode editar batidas', 'warning');
            return;
        }

        this.closePunchDetailsModal();
        const punch = db.getPunchById(punchIdOrNsr);
        if (!punch) return;

        const emp = db.getEmployeeById(punch.employeeId);

        document.getElementById('edit-punch-id').value = punch.id;
        document.getElementById('edit-punch-date').value = punch.dateStr;
        document.getElementById('edit-punch-time').value = punch.timeStr;
        document.getElementById('edit-punch-type').value = punch.type;
        document.getElementById('edit-punch-notes').value = punch.notes || '';

        const empInfo = document.getElementById('edit-punch-emp-info');
        const nsrInfo = document.getElementById('edit-punch-nsr-info');

        if (empInfo) empInfo.textContent = `Colaborador: ${emp ? emp.name : punch.employeeName}`;
        if (nsrInfo) nsrInfo.textContent = `NSR: ${String(punch.nsr).padStart(6, '0')} • Registro: ${punch.dateStr} ${punch.timeStr}`;

        if (this.dom.editPunchModal) {
            this.dom.editPunchModal.classList.remove('hidden');
        }
    }

    closeEditPunchModal() {
        if (this.dom.editPunchModal) {
            this.dom.editPunchModal.classList.add('hidden');
        }
    }

    handleSaveEditedPunch(e) {
        e.preventDefault();
        const punchId = document.getElementById('edit-punch-id').value;
        const dateStr = document.getElementById('edit-punch-date').value;
        const timeStr = document.getElementById('edit-punch-time').value.trim();
        const type = document.getElementById('edit-punch-type').value;
        const notes = document.getElementById('edit-punch-notes').value.trim();

        if (!dateStr || !timeStr) {
            this.showToast('Data e horário são obrigatórios', 'warning');
            return;
        }

        const updated = db.updatePunch(punchId, {
            dateStr,
            timeStr,
            type,
            notes: notes || 'Alteração pelo RH'
        });

        if (updated) {
            this.playSuccessSound();
            this.showToast('Batida de ponto atualizada com sucesso!', 'success');
            this.closeEditPunchModal();
            this.renderTodayDashboard();
            this.renderLargeEmployeeGrid();
            this.renderTimesheet();
            this.renderAdminDashboard();
        }
    }

    confirmDeletePunch(punchIdOrNsr) {
        if (!this.isRh) {
            this.showToast('Apenas o responsável do RH pode excluir batidas', 'warning');
            return;
        }

        this.closePunchDetailsModal();
        this.closeDayPunchesModal();

        const punch = db.getPunchById(punchIdOrNsr);
        if (!punch) return;

        this.currentPendingDelete = { type: 'punch', id: punch.id };

        const titleEl = document.getElementById('confirm-title');
        const msgEl = document.getElementById('confirm-message');
        const actionBtn = document.getElementById('confirm-btn-action');

        if (titleEl) titleEl.textContent = 'Excluir Batida de Ponto';
        if (msgEl) msgEl.innerHTML = `Tem certeza que deseja excluir a batida de <strong>${punch.timeStr}</strong> (${punch.dateStr})? O saldo será recalculado imediatamente.`;
        if (actionBtn) {
            actionBtn.textContent = 'Sim, Excluir Batida';
            actionBtn.onclick = () => this.executePendingDelete();
        }

        if (this.dom.confirmModal) {
            this.dom.confirmModal.classList.remove('hidden');
        }
    }

    openDayPunchesModal(dateStr) {
        const empId = this.currentUser ? this.currentUser.id : null;
        if (!empId) return;

        const punches = db.getPunchesByEmployee(empId).filter(p => p.dateStr === dateStr);
        const listEl = document.getElementById('day-punches-list');
        const subtitleEl = document.getElementById('day-punches-subtitle');

        if (subtitleEl) {
            subtitleEl.textContent = `Registros do dia ${dateStr} para ${this.currentUser.name}`;
        }

        if (listEl) {
            if (punches.length === 0) {
                listEl.innerHTML = `
                    <div class="text-center py-6 text-slate-500">
                        <i class="fa-regular fa-clock text-2xl mb-2"></i>
                        <p class="text-xs">Nenhuma batida registrada nesta data.</p>
                    </div>
                `;
            } else {
                const typeBadges = {
                    'entrada': { text: 'Entrada', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
                    'saida_intervalo': { text: 'Saída Intervalo', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
                    'retorno_intervalo': { text: 'Retorno Intervalo', color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' },
                    'saida': { text: 'Saída Final', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
                    'entrada_extra': { text: 'Hora Extra', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' }
                };

                listEl.innerHTML = punches.map(p => {
                    const badge = typeBadges[p.type] || { text: p.type, color: 'text-slate-300 bg-slate-800' };
                    const rhButtons = this.isRh ? `
                        <div class="flex items-center gap-1.5">
                            <button onclick="app.showPunchDetails('${p.id}')" class="p-2 text-xs bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg transition" title="Visualizar com Foto">
                                <i class="fa-solid fa-eye"></i>
                            </button>
                            <button onclick="app.openEditPunchModal('${p.id}')" class="p-2 text-xs bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg transition" title="Editar Batida">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button onclick="app.confirmDeletePunch('${p.id}')" class="p-2 text-xs bg-slate-800 hover:bg-rose-900/40 text-rose-400 rounded-lg transition" title="Excluir Batida">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    ` : '';

                    return `
                        <div class="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
                            <div class="flex items-center gap-3">
                                <img src="${p.photoUrl || this.currentUser.photoUrl}" class="w-12 h-12 rounded-xl object-cover border border-slate-700" alt="Foto">
                                <div>
                                    <div class="flex items-center gap-2">
                                        <span class="font-mono font-bold text-sm text-slate-100">${p.timeStr}</span>
                                        <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${badge.color}">${badge.text}</span>
                                    </div>
                                    <span class="text-[10px] text-slate-400 block font-mono">NSR: ${p.nsr}</span>
                                </div>
                            </div>

                            ${rhButtons}
                        </div>
                    `;
                }).join('');
            }
        }

        if (this.dom.dayPunchesModal) {
            this.dom.dayPunchesModal.classList.remove('hidden');
        }
    }

    closeDayPunchesModal() {
        if (this.dom.dayPunchesModal) {
            this.dom.dayPunchesModal.classList.add('hidden');
        }
    }

    // ============================================================
    // 8. VISUALIZAR, EDITAR E EXCLUIR PERFIS (RESTRITO AO RH)
    // ============================================================
    openViewEmployeeModal(empId) {
        if (!this.isRh) {
            this.showToast('Acesso restrito ao RH', 'warning');
            return;
        }

        const emp = db.getEmployeeById(empId);
        if (!emp) return;

        const content = document.getElementById('view-employee-content');
        const btnEdit = document.getElementById('view-employee-btn-edit');

        if (content) {
            const todayStr = db.formatDate(new Date());
            const todayPunches = db.getAllPunches().filter(p => p.employeeId === emp.id && p.dateStr === todayStr);

            content.innerHTML = `
                <div class="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-950 rounded-2xl border border-slate-800">
                    <img src="${emp.photoUrl}" alt="${emp.name}" class="w-24 h-24 rounded-full object-cover border-4 border-blue-500/40 shadow-xl bg-slate-900">
                    <div class="text-center sm:text-left space-y-1">
                        <div class="flex items-center gap-2 justify-center sm:justify-start">
                            <h2 class="text-base font-bold text-white">${emp.name}</h2>
                            ${emp.isAdmin ? '<span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">RH</span>' : ''}
                        </div>
                        <p class="text-xs text-blue-400 font-semibold">${emp.role}</p>
                        <p class="text-[11px] text-slate-400">${emp.department}</p>
                        <p class="text-[10px] text-slate-500 font-mono">${emp.email}</p>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3 text-xs">
                    <div class="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                        <span class="text-slate-400 block text-[10px] uppercase font-bold">CPF</span>
                        <span class="text-slate-200 font-mono font-bold">${emp.cpf}</span>
                    </div>
                    <div class="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                        <span class="text-slate-400 block text-[10px] uppercase font-bold">Matrícula</span>
                        <span class="text-slate-200 font-mono font-bold">${emp.registrationNumber}</span>
                    </div>
                    <div class="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                        <span class="text-slate-400 block text-[10px] uppercase font-bold">Carga Horária</span>
                        <span class="text-slate-200 font-bold">${emp.dailyHours}h diárias</span>
                    </div>
                    <div class="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                        <span class="text-slate-400 block text-[10px] uppercase font-bold">PIN Único</span>
                        <span class="text-slate-200 font-mono font-bold">${emp.pin ? 'Cadastrado' : '<span class="text-amber-400">Em Branco</span>'}</span>
                    </div>
                </div>

                <div class="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
                    <span class="text-slate-400 block text-[10px] uppercase font-bold mb-1">Batidas de Hoje (${todayPunches.length})</span>
                    <p class="text-xs text-slate-300 font-mono">
                        ${todayPunches.length > 0 ? todayPunches.map(p => `${p.timeStr} (${p.type})`).join(' • ') : 'Nenhuma batida registrada hoje'}
                    </p>
                </div>
            `;
        }

        if (btnEdit) {
            btnEdit.onclick = () => {
                this.closeViewEmployeeModal();
                this.openEditEmployeeModal(emp.id);
            };
        }

        if (this.dom.viewEmployeeModal) {
            this.dom.viewEmployeeModal.classList.remove('hidden');
        }
    }

    closeViewEmployeeModal() {
        if (this.dom.viewEmployeeModal) {
            this.dom.viewEmployeeModal.classList.add('hidden');
        }
    }

    openEditEmployeeModal(empId) {
        if (!this.isRh) {
            this.showToast('Acesso restrito ao RH', 'warning');
            return;
        }

        const emp = db.getEmployeeById(empId) || this.currentUser;
        if (!emp) return;

        document.getElementById('edit-emp-id').value = emp.id;
        document.getElementById('edit-emp-name').value = emp.name;
        document.getElementById('edit-emp-email').value = emp.email || '';
        document.getElementById('edit-emp-role').value = emp.role;
        document.getElementById('edit-emp-department').value = emp.department;
        document.getElementById('edit-emp-cpf').value = emp.cpf;
        document.getElementById('edit-emp-registration').value = emp.registrationNumber;
        document.getElementById('edit-emp-daily-hours').value = emp.dailyHours || 8;
        document.getElementById('edit-emp-pin').value = emp.pin || '';
        document.getElementById('edit-emp-photo-url').value = emp.photoUrl || '';

        const previewImg = document.getElementById('edit-emp-photo-preview');
        if (previewImg) previewImg.src = emp.photoUrl;

        const fileInput = document.getElementById('edit-emp-file-input');
        if (fileInput) fileInput.value = '';

        if (this.dom.editEmployeeModal) {
            this.dom.editEmployeeModal.classList.remove('hidden');
        }
    }

    closeEditEmployeeModal() {
        if (this.dom.editEmployeeModal) {
            this.dom.editEmployeeModal.classList.add('hidden');
        }
    }

    captureWebcamForProfileEdit() {
        this.triggerCameraFlash();

        let newPhotoUrl = null;
        if (this.stream && this.dom.videoPreview && !this.dom.videoPreview.classList.contains('hidden')) {
            const canvas = document.createElement('canvas');
            canvas.width = 400;
            canvas.height = 400;
            const ctx = canvas.getContext('2d');

            const vWidth = this.dom.videoPreview.videoWidth || 640;
            const vHeight = this.dom.videoPreview.videoHeight || 480;
            const size = Math.min(vWidth, vHeight);
            const startX = (vWidth - size) / 2;
            const startY = (vHeight - size) / 2;

            ctx.drawImage(this.dom.videoPreview, startX, startY, size, size, 0, 0, canvas.width, canvas.height);
            newPhotoUrl = canvas.toDataURL('image/jpeg', 0.9);
        } else {
            newPhotoUrl = `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 500)}?w=300&auto=format&fit=crop&q=80`;
        }

        const previewImg = document.getElementById('edit-emp-photo-preview');
        const urlInput = document.getElementById('edit-emp-photo-url');

        if (previewImg) previewImg.src = newPhotoUrl;
        if (urlInput) urlInput.value = newPhotoUrl;

        this.showToast('Foto capturada pela webcam com sucesso!', 'success');
    }

    handleSaveEditedEmployee(e) {
        e.preventDefault();

        const id = document.getElementById('edit-emp-id').value;
        const name = document.getElementById('edit-emp-name').value.trim();
        const email = document.getElementById('edit-emp-email').value.trim();
        const role = document.getElementById('edit-emp-role').value.trim();
        const department = document.getElementById('edit-emp-department').value;
        const cpf = document.getElementById('edit-emp-cpf').value.trim();
        const registration = document.getElementById('edit-emp-registration').value.trim();
        const dailyHours = Number(document.getElementById('edit-emp-daily-hours').value) || 8;
        const pin = document.getElementById('edit-emp-pin').value.trim();
        const photoUrl = document.getElementById('edit-emp-photo-url').value.trim() || document.getElementById('edit-emp-photo-preview').src;

        if (!name || !cpf || !registration) {
            this.showToast('Preencha os campos obrigatórios', 'warning');
            return;
        }

        try {
            const saved = db.saveEmployee({
                id,
                name,
                email,
                role,
                department,
                cpf,
                registrationNumber: registration,
                dailyHours,
                pin,
                photoUrl
            });

            if (this.currentUser && this.currentUser.id === id) {
                this.currentUser = saved;
            }

            this.playSuccessSound();
            this.showToast('Perfil e foto do colaborador atualizados!', 'success');
            this.closeEditEmployeeModal();

            this.renderLargeEmployeeGrid();
            this.renderTodayDashboard();
            this.renderTimesheet();
            this.renderAdminDashboard();

        } catch (err) {
            this.playWarningSound();
            this.showToast(err.message, 'error');
        }
    }

    confirmDeleteEmployee(empId) {
        if (!this.isRh) {
            this.showToast('Acesso restrito ao RH', 'warning');
            return;
        }

        const emp = db.getEmployeeById(empId);
        if (!emp) return;

        this.currentPendingDelete = { type: 'employee', id: emp.id };

        const titleEl = document.getElementById('confirm-title');
        const msgEl = document.getElementById('confirm-message');
        const actionBtn = document.getElementById('confirm-btn-action');

        if (titleEl) titleEl.textContent = 'Excluir Colaborador';
        if (msgEl) msgEl.innerHTML = `Tem certeza que deseja excluir o cadastro de <strong>${emp.name}</strong> (${emp.registrationNumber})?`;
        if (actionBtn) {
            actionBtn.textContent = 'Sim, Excluir';
            actionBtn.onclick = () => this.executePendingDelete();
        }

        if (this.dom.confirmModal) {
            this.dom.confirmModal.classList.remove('hidden');
        }
    }

    executePendingDelete() {
        if (!this.currentPendingDelete) return;

        const { type, id } = this.currentPendingDelete;

        if (type === 'punch') {
            db.deletePunch(id);
            this.showToast('Batida de ponto excluída com sucesso!', 'info');
        } else if (type === 'employee') {
            db.deleteEmployee(id);
            this.currentUser = db.getCurrentUser();
            this.showToast('Colaborador excluído com sucesso!', 'info');
        }

        this.closeConfirmModal();
        this.renderLargeEmployeeGrid();
        this.renderTodayDashboard();
        this.renderTimesheet();
        this.renderAdminDashboard();
    }

    closeConfirmModal() {
        if (this.dom.confirmModal) {
            this.dom.confirmModal.classList.add('hidden');
        }
        this.currentPendingDelete = null;
    }

    // ============================================================
    // 9. RESUMO DO DIA
    // ============================================================
    renderTodayDashboard() {
        const punches = db.getAllPunches().filter(p => p.dateStr === db.formatDate(new Date()))
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        if (this.dom.todayPunchesCount) {
            this.dom.todayPunchesCount.textContent = `${punches.length} registro(s)`;
        }

        if (this.dom.todaySummaryList) {
            if (punches.length === 0) {
                this.dom.todaySummaryList.innerHTML = `
                    <div class="text-center py-6 text-slate-500">
                        <i class="fa-regular fa-clock text-2xl mb-1 text-slate-600"></i>
                        <p class="text-xs">Nenhum ponto registrado hoje ainda.</p>
                    </div>
                `;
            } else {
                const typeBadges = {
                    'entrada': { text: 'Entrada', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
                    'saida_intervalo': { text: 'Intervalo', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
                    'retorno_intervalo': { text: 'Retorno', color: 'bg-sky-500/20 text-sky-400 border-sky-500/30' },
                    'saida': { text: 'Saída', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
                    'entrada_extra': { text: 'Extra', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' }
                };

                this.dom.todaySummaryList.innerHTML = punches.map(p => {
                    const badge = typeBadges[p.type] || { text: p.type, color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' };
                    const emp = db.getEmployeeById(p.employeeId);

                    const rhActionsHtml = this.isRh ? `
                        <div class="flex items-center gap-1">
                            <button onclick="app.showPunchDetails('${p.id}')" class="text-xs text-blue-400 hover:text-blue-300 p-1 rounded hover:bg-slate-700 transition" title="Ver foto">
                                <i class="fa-solid fa-camera"></i>
                            </button>
                            <button onclick="app.openEditPunchModal('${p.id}')" class="text-xs text-amber-400 hover:text-amber-300 p-1 rounded hover:bg-slate-700 transition" title="Editar">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button onclick="app.confirmDeletePunch('${p.id}')" class="text-xs text-rose-400 hover:text-rose-300 p-1 rounded hover:bg-slate-700 transition" title="Excluir">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    ` : `
                        <button onclick="app.showReceiptModalByNsr(${p.nsr})" class="text-[11px] text-blue-400 hover:text-blue-300 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                            Recibo
                        </button>
                    `;

                    return `
                        <div class="flex items-center justify-between p-2.5 bg-slate-950/70 rounded-xl border border-slate-800">
                            <div class="flex items-center gap-2.5">
                                <img src="${p.photoUrl || (emp ? emp.photoUrl : '')}" class="w-8 h-8 rounded-full object-cover border border-slate-700" alt="">
                                <div>
                                    <div class="flex items-center gap-1.5">
                                        <span class="font-bold text-xs text-slate-200">${emp ? emp.name.split(' ')[0] : p.employeeName}</span>
                                        <span class="px-1.5 py-0.2 rounded text-[9px] font-bold border ${badge.color}">${badge.text}</span>
                                    </div>
                                    <span class="font-mono text-[11px] text-slate-400 font-bold">${p.timeStr}</span>
                                </div>
                            </div>
                            ${rhActionsHtml}
                        </div>
                    `;
                }).join('');
            }
        }
    }

    showReceiptModalByNsr(nsr) {
        this.closePunchDetailsModal();
        const punch = db.getPunchById(nsr);
        if (punch) {
            this.showReceiptModal(punch);
        }
    }

    // ============================================================
    // 10. MEU ESPELHO DE PONTO (TIMESHEET)
    // ============================================================
    renderTimesheet() {
        if (!this.currentUser) return;

        if (this.dom.timesheetMonthInput && !this.dom.timesheetMonthInput.value) {
            this.dom.timesheetMonthInput.value = this.timesheetYearMonth;
        }

        const yearMonth = this.dom.timesheetMonthInput ? this.dom.timesheetMonthInput.value : this.timesheetYearMonth;
        const timesheet = db.getMonthlyTimesheet(this.currentUser.id, yearMonth);

        if (!timesheet) return;

        const elWorked = document.getElementById('ts-sum-worked');
        const elExpected = document.getElementById('ts-sum-expected');
        const elBalance = document.getElementById('ts-sum-balance');
        const elWorkDays = document.getElementById('ts-sum-workdays');

        if (elWorked) elWorked.textContent = timesheet.summary.totalWorkedFormatted;
        if (elExpected) elExpected.textContent = timesheet.summary.totalExpectedFormatted;
        if (elWorkDays) elWorkDays.textContent = `${timesheet.summary.workDaysCount} dias`;

        if (elBalance) {
            elBalance.textContent = timesheet.summary.netBalanceFormatted;
            if (timesheet.summary.netBalanceMinutes >= 0) {
                elBalance.className = 'text-2xl font-black text-emerald-400';
            } else {
                elBalance.className = 'text-2xl font-black text-rose-400';
            }
        }

        if (this.dom.timesheetTableBody) {
            this.dom.timesheetTableBody.innerHTML = timesheet.days.map(d => {
                const rowClass = d.isWeekend 
                    ? 'bg-slate-900/40 text-slate-400' 
                    : d.isToday 
                    ? 'bg-blue-950/30 border-l-4 border-l-blue-500' 
                    : 'hover:bg-slate-800/40';

                let balanceBadge = '--:--';
                if (d.metrics) {
                    const isPos = d.metrics.balanceMinutes >= 0;
                    balanceBadge = `
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${isPos ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}">
                            ${d.metrics.balanceFormatted}
                        </span>
                    `;
                }

                const [y, m, dayNum] = d.date.split('-');
                const displayDate = `${dayNum}/${m}`;

                return `
                    <tr class="${rowClass} border-b border-slate-800/80 transition">
                        <td class="py-3 px-4 font-mono font-bold text-slate-200">
                            ${displayDate}
                            <span class="block text-[11px] font-normal text-slate-400">${d.dayOfWeek}</span>
                        </td>
                        <td class="py-3 px-3 font-mono text-center text-slate-300">${d.entrada1}</td>
                        <td class="py-3 px-3 font-mono text-center text-slate-300">${d.saida1}</td>
                        <td class="py-3 px-3 font-mono text-center text-slate-300">${d.entrada2}</td>
                        <td class="py-3 px-3 font-mono text-center text-slate-300">${d.saida2}</td>
                        <td class="py-3 px-4 font-mono font-bold text-center text-slate-100">
                            ${d.metrics ? d.metrics.workedFormatted : '--:--'}
                        </td>
                        <td class="py-3 px-4 text-center">
                            ${balanceBadge}
                        </td>
                        <td class="py-3 px-4 text-right no-print">
                            ${d.punches.length > 0 ? `
                                <button onclick="app.openDayPunchesModal('${d.date}')" class="text-xs text-blue-400 hover:text-blue-300 p-1.5 rounded hover:bg-slate-700 transition" title="Visualizar batidas">
                                    <i class="fa-solid fa-list-check"></i> Batidas
                                </button>
                            ` : `
                                <button onclick="app.openAdjustmentRequest('${d.date}')" class="text-xs text-slate-400 hover:text-amber-400 p-1.5 rounded hover:bg-slate-700 transition" title="Solicitar ajuste">
                                    <i class="fa-solid fa-pen-to-square"></i> Ajuste
                                </button>
                            `}
                        </td>
                    </tr>
                `;
            }).join('');
        }

        this.updatePrintableHeader(timesheet);
    }

    updatePrintableHeader(timesheet) {
        const printEmp = document.getElementById('print-emp-info');
        if (printEmp) {
            printEmp.innerHTML = `
                <div class="border-b-2 border-slate-900 pb-3 mb-4">
                    <div class="flex justify-between items-start">
                        <div>
                            <h1 class="text-xl font-bold">PONTOFLOW</h1>
                            <h2 class="text-base font-bold mt-1">ESPELHO DE PONTO ELETRÔNICO INDIVIDUAL</h2>
                        </div>
                        <div class="text-right text-xs">
                            <p><strong>Mês de Referência:</strong> ${timesheet.yearMonth}</p>
                            <p><strong>Emissão:</strong> ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-slate-300 text-xs">
                        <div><strong>Colaborador:</strong> ${timesheet.employee.name}</div>
                        <div><strong>CPF:</strong> ${timesheet.employee.cpf}</div>
                        <div><strong>Matrícula:</strong> ${timesheet.employee.registrationNumber}</div>
                        <div><strong>Cargo:</strong> ${timesheet.employee.role}</div>
                        <div><strong>Departamento:</strong> ${timesheet.employee.department}</div>
                        <div><strong>Jornada:</strong> ${timesheet.employee.dailyHours}h diárias</div>
                    </div>
                </div>
            `;
        }
    }

    openAdjustmentRequest(dateStr) {
        this.switchTab('solicitacoes');
        const dateInput = document.getElementById('req-date-input');
        if (dateInput) dateInput.value = dateStr;
    }

    printTimesheet() {
        window.print();
    }

    exportTimesheetCSV() {
        const yearMonth = this.dom.timesheetMonthInput ? this.dom.timesheetMonthInput.value : this.timesheetYearMonth;
        const timesheet = db.getMonthlyTimesheet(this.currentUser.id, yearMonth);
        if (!timesheet) return;

        let csvContent = 'data:text/csv;charset=utf-8,';
        csvContent += `Colaborador;${timesheet.employee.name};CPF;${timesheet.employee.cpf};Matrícula;${timesheet.employee.registrationNumber}\n`;
        csvContent += `Mes Referencia;${yearMonth}\n\n`;
        csvContent += `Data;Dia da Semana;Entrada 1;Saida 1;Entrada 2;Saida 2;Total Trabalhado;Saldo Diario\n`;

        timesheet.days.forEach(d => {
            const worked = d.metrics ? d.metrics.workedFormatted : '00:00';
            const bal = d.metrics ? d.metrics.balanceFormatted : '00:00';
            csvContent += `${d.date};${d.dayOfWeek};${d.entrada1};${d.saida1};${d.entrada2};${d.saida2};${worked};${bal}\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `espelho_ponto_${timesheet.employee.registrationNumber}_${yearMonth}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showToast('Espelho de ponto exportado em CSV com sucesso!', 'success');
    }

    // ============================================================
    // 11. SOLICITAÇÕES
    // ============================================================
    handleCreateRequest(e) {
        e.preventDefault();

        const type = document.getElementById('req-type-select').value;
        const date = document.getElementById('req-date-input').value;
        const punchType = document.getElementById('req-punch-type-select').value;
        const time = document.getElementById('req-time-input').value;
        const reason = document.getElementById('req-reason-input').value.trim();

        if (!date || !reason) {
            this.showToast('Preencha a data e a justificativa', 'warning');
            return;
        }

        db.addRequest({
            employeeId: this.currentUser ? this.currentUser.id : 'EMP-001',
            employeeName: this.currentUser ? this.currentUser.name : 'Colaborador',
            type: type,
            date: date,
            punchType: punchType,
            time: time || '08:00',
            reason: reason
        });

        this.showToast('Solicitação enviada para análise do RH!', 'success');
        document.getElementById('adjustment-form').reset();
        this.renderRequests();
        this.renderAdminDashboard();
    }

    renderRequests() {
        const container = document.getElementById('requests-history-list');
        if (!container) return;

        const allRequests = db.getRequests();

        if (allRequests.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-slate-500">
                    <i class="fa-solid fa-folder-open text-3xl mb-2"></i>
                    <p class="text-sm">Nenhuma solicitação no momento.</p>
                </div>
            `;
            return;
        }

        const statusBadges = {
            'PENDENTE': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
            'APROVADO': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
            'RECUSADO': 'bg-rose-500/10 text-rose-400 border-rose-500/30'
        };

        container.innerHTML = allRequests.map(r => `
            <div class="p-4 bg-slate-800/80 rounded-xl border border-slate-700/60 space-y-2">
                <div class="flex items-center justify-between">
                    <span class="font-bold text-slate-200 text-sm">
                        ${r.employeeName} - ${r.type === 'AJUSTE' ? 'Ajuste de Batida' : 'Atestado'}
                    </span>
                    <span class="px-2.5 py-1 text-xs font-semibold rounded-full border ${statusBadges[r.status]}">
                        ${r.status}
                    </span>
                </div>
                <div class="text-xs text-slate-400 flex flex-wrap gap-4">
                    <span><strong class="text-slate-300">Data:</strong> ${r.date}</span>
                    ${r.time ? `<span><strong class="text-slate-300">Horário:</strong> ${r.time}</span>` : ''}
                </div>
                <p class="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                    <strong>Motivo:</strong> ${r.reason}
                </p>
            </div>
        `).join('');
    }

    // ============================================================
    // 12. GESTÃO DO RH & QUADRO DE COLABORADORES
    // ============================================================
    renderAdminDashboard() {
        const employees = db.getEmployees();
        const allPunches = db.getAllPunches();
        const todayStr = db.formatDate(new Date());

        let presentCount = 0;
        let lunchCount = 0;
        let absentCount = 0;

        const employeeStatusList = employees.map(emp => {
            const todayPunches = allPunches.filter(p => p.employeeId === emp.id && p.dateStr === todayStr)
                .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            let status = 'AUSENTE';
            let statusColor = 'text-slate-400 bg-slate-500/10 border-slate-500/20';
            let lastPunchText = 'Sem batida hoje';

            if (todayPunches.length > 0) {
                const last = todayPunches[todayPunches.length - 1];
                lastPunchText = `${last.timeStr} (${last.type})`;

                if (last.type === 'entrada' || last.type === 'retorno_intervalo' || last.type === 'entrada_extra') {
                    status = 'TRABALHANDO';
                    statusColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
                    presentCount++;
                } else if (last.type === 'saida_intervalo') {
                    status = 'EM ALMOÇO';
                    statusColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
                    lunchCount++;
                } else if (last.type === 'saida') {
                    status = 'EXPEDIENTE FIM';
                    statusColor = 'text-sky-400 bg-sky-500/10 border-sky-500/30';
                }
            } else {
                absentCount++;
            }

            return { emp, status, statusColor, lastPunchText };
        });

        const elTotalEmp = document.getElementById('admin-stat-total-emp');
        const elPresent = document.getElementById('admin-stat-present');
        const elLunch = document.getElementById('admin-stat-lunch');
        const elAbsent = document.getElementById('admin-stat-absent');

        if (elTotalEmp) elTotalEmp.textContent = employees.length;
        if (elPresent) elPresent.textContent = presentCount;
        if (elLunch) elLunch.textContent = lunchCount;
        if (elAbsent) elAbsent.textContent = absentCount;

        const listContainer = document.getElementById('admin-live-presence-list');
        if (listContainer) {
            listContainer.innerHTML = employeeStatusList.map(item => `
                <tr class="border-b border-slate-800 hover:bg-slate-800/40 transition">
                    <td class="py-3 px-4 flex items-center gap-3">
                        <img src="${item.emp.photoUrl}" class="w-9 h-9 rounded-full object-cover border border-slate-700 cursor-pointer" onclick="app.openViewEmployeeModal('${item.emp.id}')" alt="">
                        <div>
                            <span class="font-bold text-slate-200 block text-sm cursor-pointer hover:text-blue-400 transition" onclick="app.openViewEmployeeModal('${item.emp.id}')">${item.emp.name}</span>
                            <span class="text-xs text-slate-400">${item.emp.role} • ${item.emp.department} • <strong class="text-slate-300">${item.emp.registrationNumber}</strong></span>
                        </div>
                    </td>
                    <td class="py-3 px-4">
                        <span class="px-2.5 py-1 text-xs font-semibold rounded-full border ${item.statusColor}">
                            ${item.status}
                        </span>
                    </td>
                    <td class="py-3 px-4 font-mono text-xs text-slate-300">
                        ${item.lastPunchText}
                    </td>
                    <td class="py-3 px-4 text-center font-mono">
                        ${item.emp.pin ? `<span class="text-xs text-slate-300 font-bold">•••• (${item.emp.pin})</span>` : '<span class="text-amber-400 text-xs font-semibold">Em branco</span>'}
                    </td>
                    <td class="py-3 px-4 text-right">
                        <div class="flex items-center justify-end gap-1.5">
                            <button onclick="app.openViewEmployeeModal('${item.emp.id}')" class="p-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg transition" title="Visualizar Perfil Completo">
                                <i class="fa-solid fa-eye"></i>
                            </button>
                            <button onclick="app.openEditEmployeeModal('${item.emp.id}')" class="p-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg transition" title="Editar Perfil e Foto">
                                <i class="fa-solid fa-user-pen"></i>
                            </button>
                            <button onclick="app.viewEmployeeTimesheet('${item.emp.id}')" class="p-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg transition" title="Ver Espelho do Mês">
                                <i class="fa-solid fa-calendar-days"></i>
                            </button>
                            <button onclick="app.confirmDeleteEmployee('${item.emp.id}')" class="p-1.5 text-xs bg-slate-800 hover:bg-rose-900/40 text-rose-400 rounded-lg transition" title="Excluir Colaborador">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }

        const pendingContainer = document.getElementById('admin-pending-requests-list');
        const pendingRequests = db.getRequests().filter(r => r.status === 'PENDENTE');

        if (pendingContainer) {
            if (pendingRequests.length === 0) {
                pendingContainer.innerHTML = `
                    <div class="text-center py-6 text-slate-500">
                        <i class="fa-solid fa-check-double text-2xl mb-1 text-emerald-400"></i>
                        <p class="text-xs">Nenhuma solicitação pendente.</p>
                    </div>
                `;
            } else {
                pendingContainer.innerHTML = pendingRequests.map(r => `
                    <div class="p-3 bg-slate-800/80 rounded-xl border border-amber-500/30 space-y-2">
                        <div class="flex justify-between items-start">
                            <div>
                                <span class="font-bold text-slate-200 text-sm block">${r.employeeName}</span>
                                <span class="text-xs text-amber-400 font-semibold">${r.type} - Data: ${r.date} ${r.time ? `(${r.time})` : ''}</span>
                            </div>
                        </div>
                        <p class="text-xs text-slate-300 bg-slate-900/70 p-2 rounded">${r.reason}</p>
                        <div class="flex justify-end gap-2 pt-1">
                            <button onclick="app.evaluateRequest('${r.id}', 'RECUSADO')" class="px-3 py-1 text-xs bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded border border-rose-500/30 transition">
                                Recusar
                            </button>
                            <button onclick="app.evaluateRequest('${r.id}', 'APROVADO')" class="px-3 py-1 text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded border border-emerald-500/30 transition font-bold">
                                Aprovar
                            </button>
                        </div>
                    </div>
                `).join('');
            }
        }

        this.renderAdminChart();
    }

    renderAdminChart() {
        const canvas = document.getElementById('admin-weekly-chart');
        if (!canvas || !window.Chart) return;

        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        const today = new Date();
        const labels = [];
        const workedHoursData = [];

        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dateStr = db.formatDate(d);
            const dayName = d.toLocaleDateString('pt-BR', { weekday: 'short' });
            labels.push(dayName.charAt(0).toUpperCase() + dayName.slice(1));

            const dayPunches = db.getAllPunches().filter(p => p.dateStr === dateStr);
            const totalHours = Math.round((dayPunches.length * 2) * 10) / 10;
            workedHoursData.push(totalHours);
        }

        this.chartInstance = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Horas Totais',
                    data: workedHoursData,
                    backgroundColor: 'rgba(59, 130, 246, 0.6)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1.5,
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.06)' },
                        ticks: { color: '#94a3b8' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8' }
                    }
                }
            }
        });
    }

    evaluateRequest(reqId, newStatus) {
        db.updateRequestStatus(reqId, newStatus, 'RH');
        this.showToast(`Solicitação: ${newStatus}`, newStatus === 'APROVADO' ? 'success' : 'info');
        this.renderAdminDashboard();
        this.renderRequests();
        this.renderTimesheet();
    }

    viewEmployeeTimesheet(empId) {
        const emp = db.getEmployeeById(empId);
        if (emp) {
            this.currentUser = emp;
            db.setCurrentUser(emp.id);
            this.switchTab('meu-espelho');
        }
    }

    openNewEmployeeModal() {
        const modal = document.getElementById('new-employee-modal');
        if (modal) modal.classList.remove('hidden');
    }

    closeNewEmployeeModal() {
        const modal = document.getElementById('new-employee-modal');
        if (modal) modal.classList.add('hidden');
    }

    handleSaveNewEmployee(e) {
        e.preventDefault();
        const name = document.getElementById('new-emp-name').value.trim();
        const email = document.getElementById('new-emp-email').value.trim();
        const role = document.getElementById('new-emp-role').value.trim();
        const department = document.getElementById('new-emp-department').value;
        const cpf = document.getElementById('new-emp-cpf').value.trim();
        const registration = document.getElementById('new-emp-registration').value.trim();
        const pin = document.getElementById('new-emp-pin').value.trim();

        if (!name || !cpf || !registration) {
            this.showToast('Preencha os campos obrigatórios', 'warning');
            return;
        }

        try {
            const newEmp = {
                name,
                email,
                role,
                department,
                cpf,
                registrationNumber: registration,
                pin,
                isAdmin: false,
                photoUrl: `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 1000)}?w=150&auto=format&fit=crop&q=80`,
                dailyHours: 8,
                active: true
            };

            db.saveEmployee(newEmp);
            this.showToast('Novo colaborador cadastrado com sucesso!', 'success');
            this.closeNewEmployeeModal();
            document.getElementById('new-employee-form').reset();
            this.renderLargeEmployeeGrid();
            this.renderAdminDashboard();

        } catch (err) {
            this.playWarningSound();
            this.showToast(err.message, 'error');
        }
    }

    // ============================================================
    // 13. MODO QUIOSQUE / TOTEM TOUCH
    // ============================================================
    openTotemMode() {
        if (this.dom.totemModal) {
            this.dom.totemModal.classList.remove('hidden');
            this.totemPin = '';
            this.updateTotemPinDisplay();
        }
    }

    closeTotemMode() {
        if (this.dom.totemModal) {
            this.dom.totemModal.classList.add('hidden');
        }
    }

    handleTotemNumpad(val) {
        if (val === 'clear') {
            this.totemPin = '';
        } else if (val === 'backspace') {
            this.totemPin = this.totemPin.slice(0, -1);
        } else {
            if (this.totemPin.length < 6) {
                this.totemPin += val;
            }
        }
        this.updateTotemPinDisplay();

        if (this.totemPin.length >= 4) {
            const employees = db.getEmployees();
            const found = employees.find(e => (e.pin && e.pin === this.totemPin) || e.registrationNumber.endsWith(this.totemPin));
            if (found) {
                this.executeTotemPunch(found);
            }
        }
    }

    updateTotemPinDisplay() {
        const display = document.getElementById('totem-pin-display');
        if (display) {
            if (this.totemPin.length === 0) {
                display.textContent = '••••';
                display.className = 'font-mono text-3xl font-extrabold text-slate-600 tracking-widest py-3 bg-slate-950 rounded-2xl border border-slate-800 mb-6';
            } else {
                display.textContent = '• '.repeat(this.totemPin.length).trim();
                display.className = 'font-mono text-3xl font-extrabold text-blue-400 tracking-widest py-3 bg-slate-950 rounded-2xl border border-slate-800 mb-6';
            }
        }
    }

    executeTotemPunch(employee) {
        const nextType = db.getNextPunchType(employee.id);
        const originalUser = this.currentUser;

        this.currentUser = employee;
        const photo = this.captureSnapshot();

        try {
            const punch = db.registerPunch({
                employeeId: employee.id,
                type: nextType,
                photoUrl: photo,
                notes: 'Registro via Totem Kiosk'
            });

            this.playSuccessSound();

            const statusBox = document.getElementById('totem-feedback-box');
            if (statusBox) {
                statusBox.innerHTML = `
                    <div class="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-center animate-bounce">
                        <i class="fa-solid fa-circle-check text-4xl text-emerald-400 mb-2"></i>
                        <h3 class="text-lg font-bold text-white">${employee.name}</h3>
                        <p class="text-emerald-300 font-semibold text-sm">Ponto registrado com sucesso! (${punch.type.toUpperCase()})</p>
                        <p class="text-xs text-slate-300 mt-1">Horário: ${punch.timeStr} • NSR: ${punch.nsr}</p>
                    </div>
                `;
            }

            setTimeout(() => {
                this.totemPin = '';
                this.updateTotemPinDisplay();
                if (statusBox) statusBox.innerHTML = '';
                this.currentUser = originalUser;
                this.renderTodayDashboard();
                this.renderLargeEmployeeGrid();
                this.renderTimesheet();
                this.renderAdminDashboard();
            }, 2500);

        } catch (e) {
            this.playWarningSound();
            this.currentUser = originalUser;
            this.showToast(e.message, 'error');
        }
    }

    // ============================================================
    // 14. NAVEGAÇÃO E TABS
    // ============================================================
    switchTab(tabId) {
        this.currentTab = tabId;

        document.querySelectorAll('.tab-view').forEach(view => {
            view.classList.add('hidden');
        });

        const targetView = document.getElementById(`${tabId}-view`);
        if (targetView) {
            targetView.classList.remove('hidden');
        }

        document.querySelectorAll('.nav-tab-btn').forEach(btn => {
            const tabTarget = btn.getAttribute('data-tab');
            if (tabTarget === tabId) {
                btn.classList.add('bg-blue-600', 'text-white');
                btn.classList.remove('text-slate-400', 'hover:bg-slate-700/60');
            } else {
                btn.classList.remove('bg-blue-600', 'text-white');
                btn.classList.add('text-slate-400', 'hover:bg-slate-700/60');
            }
        });

        if (tabId === 'gestao') {
            this.renderAdminDashboard();
        } else if (tabId === 'bater-ponto') {
            this.renderLargeEmployeeGrid();
            this.renderTodayDashboard();
        }
    }

    setupEventListeners() {
        if (this.dom.empSearchInput) {
            this.dom.empSearchInput.addEventListener('input', (e) => {
                this.renderLargeEmployeeGrid(e.target.value);
            });
        }

        document.querySelectorAll('.nav-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.getAttribute('data-tab');
                if (tab) this.switchTab(tab);
            });
        });

        const rhLoginForm = document.getElementById('rh-login-form');
        if (rhLoginForm) {
            rhLoginForm.addEventListener('submit', (e) => this.handleRhLogin(e));
        }

        if (this.dom.timesheetMonthInput) {
            this.dom.timesheetMonthInput.addEventListener('change', () => {
                this.renderTimesheet();
            });
        }

        const adjForm = document.getElementById('adjustment-form');
        if (adjForm) {
            adjForm.addEventListener('submit', (e) => this.handleCreateRequest(e));
        }

        const newEmpForm = document.getElementById('new-employee-form');
        if (newEmpForm) {
            newEmpForm.addEventListener('submit', (e) => this.handleSaveNewEmployee(e));
        }

        const editPunchForm = document.getElementById('edit-punch-form');
        if (editPunchForm) {
            editPunchForm.addEventListener('submit', (e) => this.handleSaveEditedPunch(e));
        }

        const editEmpForm = document.getElementById('edit-employee-form');
        if (editEmpForm) {
            editEmpForm.addEventListener('submit', (e) => this.handleSaveEditedEmployee(e));
        }

        const fileInput = document.getElementById('edit-emp-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (loadEvent) => {
                        const base64Data = loadEvent.target.result;
                        const previewImg = document.getElementById('edit-emp-photo-preview');
                        const urlInput = document.getElementById('edit-emp-photo-url');
                        if (previewImg) previewImg.src = base64Data;
                        if (urlInput) urlInput.value = base64Data;
                        this.showToast('Foto carregada com sucesso!', 'success');
                    };
                    reader.readAsDataURL(file);
                }
            });
        }
    }

    // ============================================================
    // 15. TOAST NOTIFICATIONS
    // ============================================================
    showToast(message, type = 'info') {
        if (!this.dom.toastContainer) return;

        const toast = document.createElement('div');
        const icons = {
            'success': '<i class="fa-solid fa-circle-check text-emerald-400"></i>',
            'error': '<i class="fa-solid fa-circle-exclamation text-rose-400"></i>',
            'warning': '<i class="fa-solid fa-triangle-exclamation text-amber-400"></i>',
            'info': '<i class="fa-solid fa-circle-info text-blue-400"></i>'
        };

        const borders = {
            'success': 'border-emerald-500/40 bg-slate-900/95 text-slate-100',
            'error': 'border-rose-500/40 bg-slate-900/95 text-slate-100',
            'warning': 'border-amber-500/40 bg-slate-900/95 text-slate-100',
            'info': 'border-blue-500/40 bg-slate-900/95 text-slate-100'
        };

        toast.className = `toast px-4 py-3 rounded-xl border shadow-2xl flex items-center gap-3 text-sm backdrop-blur-md ${borders[type] || borders.info}`;
        toast.innerHTML = `
            ${icons[type] || icons.info}
            <span class="font-medium">${message}</span>
        `;

        this.dom.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(15px)';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }
}

// Inicializar aplicação
document.addEventListener('DOMContentLoaded', () => {
    window.app = new PontoApp();
});
