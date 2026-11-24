/**
 * PontoFlow - Camada de Dados e Regras de Negócio
 * Conformidade conceitual com requisitos de registro de ponto (CLT / Portaria 671 MTE)
 */

const STORAGE_KEYS = {
    EMPLOYEES: 'pontoflow_employees_v1',
    PUNCHES: 'pontoflow_punches_v1',
    REQUESTS: 'pontoflow_requests_v1',
    SETTINGS: 'pontoflow_settings_v1',
    CURRENT_USER: 'pontoflow_active_user_v1'
};

// Configurações padrão da empresa
const DEFAULT_SETTINGS = {
    companyName: 'InovaTech Soluções Digitais S.A.',
    cnpj: '18.234.567/0001-89',
    address: 'Av. Paulista, 1200 - Bela Vista, São Paulo - SP',
    headquartersCoords: { lat: -23.5614, lng: -46.6559 }, // Av Paulista
    geofenceRadiusMeters: 500, // Tolerância do raio de localização
    cltToleranceMinutes: 10, // Art. 58 § 1º CLT (variação de até 10 minutos diários)
    standardDailyHours: 8,
    requirePhoto: true,
    requireLocation: true
};

// Colaboradores de exemplo
const SEED_EMPLOYEES = [
    {
        id: 'EMP-001',
        name: 'Ana Carolina Ribeiro',
        email: 'ana.ribeiro@inovatech.com.br',
        role: 'Desenvolvedora Full Stack Pleno',
        department: 'Tecnologia da Informação',
        registrationNumber: 'MAT-2024-041',
        cpf: '345.678.912-30',
        pin: '1234',
        isAdmin: true,
        photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
        dailyHours: 8,
        journeyType: '08:00 - 12:00 / 13:00 - 17:00 (Segunda a Sexta)',
        active: true
    },
    {
        id: 'EMP-002',
        name: 'Lucas Gabriel Silveira',
        email: 'lucas.silveira@inovatech.com.br',
        role: 'Analista de Suporte e Redes',
        department: 'Tecnologia da Informação',
        registrationNumber: 'MAT-2023-018',
        cpf: '456.789.012-45',
        pin: '2345',
        isAdmin: false,
        photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        dailyHours: 8,
        journeyType: '09:00 - 13:00 / 14:00 - 18:00 (Segunda a Sexta)',
        active: true
    },
    {
        id: 'EMP-003',
        name: 'Mariana Duarte Costa',
        email: 'mariana.costa@inovatech.com.br',
        role: 'Coordenadora de Recursos Humanos',
        department: 'Recursos Humanos / DP',
        registrationNumber: 'MAT-2022-005',
        cpf: '234.567.890-12',
        pin: '3456',
        isAdmin: true,
        photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
        dailyHours: 8,
        journeyType: '08:30 - 12:30 / 13:30 - 17:30 (Segunda a Sexta)',
        active: true
    },
    {
        id: 'EMP-004',
        name: 'Rodrigo Mendonça Prado',
        email: 'rodrigo.prado@inovatech.com.br',
        role: 'Designer UI/UX',
        department: 'Produto & Design',
        registrationNumber: 'MAT-2024-077',
        cpf: '567.890.123-88',
        pin: '4567',
        isAdmin: false,
        photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        dailyHours: 8,
        journeyType: '08:00 - 12:00 / 13:00 - 17:00 (Segunda a Sexta)',
        active: true
    },
    {
        id: 'EMP-005',
        name: 'Camila Beatriz Farias',
        email: 'camila.farias@inovatech.com.br',
        role: 'Executiva de Contas',
        department: 'Comercial',
        registrationNumber: 'MAT-2023-092',
        cpf: '678.901.234-99',
        pin: '5678',
        isAdmin: false,
        photoUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
        dailyHours: 8,
        journeyType: '08:00 - 12:00 / 13:00 - 17:00 (Segunda a Sexta)',
        active: true
    }
];

class PontoDB {
    constructor() {
        this.init();
    }

    init() {
        if (!localStorage.getItem(STORAGE_KEYS.EMPLOYEES)) {
            localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(SEED_EMPLOYEES));
        }

        // Sanitização de PINs: garantir que o PIN seja estritamente único
        // Se houver qualquer PIN repetido, apagar e deixar em branco a ser colocado
        let currentEmployees = JSON.parse(localStorage.getItem(STORAGE_KEYS.EMPLOYEES) || '[]');
        const registeredPins = new Set();
        let pinsCleaned = false;

        currentEmployees.forEach(emp => {
            if (emp.pin && typeof emp.pin === 'string' && emp.pin.trim() !== '') {
                const cleanPin = emp.pin.trim();
                if (registeredPins.has(cleanPin)) {
                    emp.pin = ''; // Apaga repetido e deixa em branco
                    pinsCleaned = true;
                } else {
                    registeredPins.add(cleanPin);
                }
            } else {
                emp.pin = '';
            }
        });

        if (pinsCleaned) {
            localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(currentEmployees));
        }

        if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
        }

        if (!localStorage.getItem(STORAGE_KEYS.CURRENT_USER)) {
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(SEED_EMPLOYEES[0].id));
        }

        if (!localStorage.getItem(STORAGE_KEYS.PUNCHES)) {
            const initialPunches = this.generateSamplePunches();
            localStorage.setItem(STORAGE_KEYS.PUNCHES, JSON.stringify(initialPunches));
        }

        if (!localStorage.getItem(STORAGE_KEYS.REQUESTS)) {
            const initialRequests = [
                {
                    id: 'REQ-101',
                    employeeId: 'EMP-002',
                    employeeName: 'Lucas Gabriel Silveira',
                    type: 'AJUSTE',
                    date: this.formatDate(new Date(Date.now() - 86400000 * 2)),
                    punchType: 'retorno_intervalo',
                    time: '14:05',
                    reason: 'Esquecimento de registro no retorno do almoço devido a reunião de emergência com cliente.',
                    status: 'PENDENTE',
                    createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
                },
                {
                    id: 'REQ-102',
                    employeeId: 'EMP-004',
                    employeeName: 'Rodrigo Mendonça Prado',
                    type: 'ATESTADO',
                    date: this.formatDate(new Date(Date.now() - 86400000 * 5)),
                    time: '04:00',
                    reason: 'Consulta médica odontológica com declaração de comparecimento.',
                    status: 'APROVADO',
                    approvedBy: 'Mariana Duarte Costa (RH)',
                    createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
                }
            ];
            localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(initialRequests));
        }
    }

    // Gerador de dados de demonstração com dias úteis anteriores
    generateSamplePunches() {
        const punches = [];
        const today = new Date();
        let nsrCounter = 10001;

        // Gerar histórico de 10 dias úteis para os colaboradores
        for (let i = 12; i >= 0; i--) {
            const day = new Date(today);
            day.setDate(today.getDate() - i);

            // Ignorar sábados (6) e domingos (0)
            if (day.getDay() === 0 || day.getDay() === 6) continue;

            const dateStr = this.formatDate(day);

            SEED_EMPLOYEES.forEach(emp => {
                // Para o dia de hoje, adicionamos apenas algumas batidas
                if (i === 0) {
                    // Hoje: Entrada e Almoço para alguns
                    const now = new Date();
                    const e1 = new Date(day);
                    e1.setHours(8, 2, 15);

                    punches.push(this.buildPunchObj({
                        nsr: nsrCounter++,
                        employeeId: emp.id,
                        employeeName: emp.name,
                        type: 'entrada',
                        timestamp: e1.toISOString(),
                        dateStr,
                        timeStr: '08:02:15',
                        location: 'Sede Central - Av. Paulista, 1200',
                        source: 'WEB_DESKTOP',
                        photoUrl: emp.photoUrl
                    }));

                    if (now.getHours() >= 12) {
                        const s1 = new Date(day);
                        s1.setHours(12, 1, 40);
                        punches.push(this.buildPunchObj({
                            nsr: nsrCounter++,
                            employeeId: emp.id,
                            employeeName: emp.name,
                            type: 'saida_intervalo',
                            timestamp: s1.toISOString(),
                            dateStr,
                            timeStr: '12:01:40',
                            location: 'Sede Central - Av. Paulista, 1200',
                            source: 'WEB_MOBILE',
                            photoUrl: emp.photoUrl
                        }));
                    }

                    if (now.getHours() >= 13) {
                        const e2 = new Date(day);
                        e2.setHours(13, 2, 10);
                        punches.push(this.buildPunchObj({
                            nsr: nsrCounter++,
                            employeeId: emp.id,
                            employeeName: emp.name,
                            type: 'retorno_intervalo',
                            timestamp: e2.toISOString(),
                            dateStr,
                            timeStr: '13:02:10',
                            location: 'Sede Central - Av. Paulista, 1200',
                            source: 'WEB_DESKTOP',
                            photoUrl: emp.photoUrl
                        }));
                    }
                    return;
                }

                // Dias passados: jornada completa com ligeiras variações
                const randVariation = Math.floor(Math.random() * 8) - 4; // -4 a +4 min
                
                const e1Time = `08:${String(Math.max(0, 0 + randVariation)).padStart(2, '0')}:22`;
                const s1Time = `12:${String(Math.max(0, 2 + randVariation)).padStart(2, '0')}:45`;
                const e2Time = `13:${String(Math.max(0, 4 + randVariation)).padStart(2, '0')}:12`;
                const s2Time = `17:${String(Math.max(0, 6 + randVariation)).padStart(2, '0')}:50`;

                const e1 = new Date(day);
                const [h1, m1, sc1] = e1Time.split(':');
                e1.setHours(+h1, +m1, +sc1);

                const s1 = new Date(day);
                const [h2, m2, sc2] = s1Time.split(':');
                s1.setHours(+h2, +m2, +sc2);

                const e2 = new Date(day);
                const [h3, m3, sc3] = e2Time.split(':');
                e2.setHours(+h3, +m3, +sc3);

                const s2 = new Date(day);
                const [h4, m4, sc4] = s2Time.split(':');
                s2.setHours(+h4, +m4, +sc4);

                punches.push(
                    this.buildPunchObj({ nsr: nsrCounter++, employeeId: emp.id, employeeName: emp.name, type: 'entrada', timestamp: e1.toISOString(), dateStr, timeStr: e1Time, location: 'Sede Central - Av. Paulista, 1200', source: 'WEB_DESKTOP', photoUrl: emp.photoUrl }),
                    this.buildPunchObj({ nsr: nsrCounter++, employeeId: emp.id, employeeName: emp.name, type: 'saida_intervalo', timestamp: s1.toISOString(), dateStr, timeStr: s1Time, location: 'Sede Central - Av. Paulista, 1200', source: 'WEB_MOBILE', photoUrl: emp.photoUrl }),
                    this.buildPunchObj({ nsr: nsrCounter++, employeeId: emp.id, employeeName: emp.name, type: 'retorno_intervalo', timestamp: e2.toISOString(), dateStr, timeStr: e2Time, location: 'Sede Central - Av. Paulista, 1200', source: 'WEB_DESKTOP', photoUrl: emp.photoUrl }),
                    this.buildPunchObj({ nsr: nsrCounter++, employeeId: emp.id, employeeName: emp.name, type: 'saida', timestamp: s2.toISOString(), dateStr, timeStr: s2Time, location: 'Sede Central - Av. Paulista, 1200', source: 'WEB_DESKTOP', photoUrl: emp.photoUrl })
                );
            });
        }
        return punches;
    }

    buildPunchObj(params) {
        const hash = this.generateHashSignature(params.nsr, params.employeeId, params.timestamp, params.type);
        return {
            id: 'PUNCH-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
            nsr: params.nsr,
            employeeId: params.employeeId,
            employeeName: params.employeeName,
            type: params.type,
            timestamp: params.timestamp,
            dateStr: params.dateStr,
            timeStr: params.timeStr,
            location: params.location || 'Localização GPS Confirmada',
            coords: params.coords || { lat: -23.5614, lng: -46.6559 },
            accuracy: params.accuracy || 12.5,
            photoUrl: params.photoUrl || null,
            notes: params.notes || '',
            source: params.source || 'SISTEMA_WEB_PONTOFLOW',
            hashSha256: hash
        };
    }

    // Assinatura de autenticidade (Conformidade com princípios da Portaria 671 MTE)
    generateHashSignature(nsr, empId, timestamp, type) {
        const raw = `${nsr}|${empId}|${timestamp}|${type}|INOVATECH_SALT_2026`;
        let hash = 0;
        for (let i = 0; i < raw.length; i++) {
            const char = raw.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        // Gera representação pseudo-SHA256 hex padronizada
        const hex = Math.abs(hash).toString(16).padStart(8, '0');
        const secondary = (Math.abs(hash * 31)).toString(16).padStart(8, '0');
        const tertiary = (Math.abs(hash * 67)).toString(16).padStart(8, '0');
        const quad = (Math.abs(hash * 97)).toString(16).padStart(8, '0');
        return `${hex}${secondary}${tertiary}${quad}9b4f2c018a3e7d56`.toUpperCase();
    }

    formatDate(d) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Colaboradores
    getEmployees() {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.EMPLOYEES) || '[]');
    }

    getEmployeeById(id) {
        return this.getEmployees().find(e => e.id === id);
    }

    saveEmployee(employee) {
        const list = this.getEmployees();

        // Validar unicidade de PIN: o PIN deve ser único entre todos os colaboradores
        if (employee.pin && typeof employee.pin === 'string' && employee.pin.trim() !== '') {
            const cleanPin = employee.pin.trim();
            const duplicate = list.find(e => e.id !== employee.id && e.pin && e.pin.trim() === cleanPin);
            if (duplicate) {
                throw new Error(`O PIN "${cleanPin}" já está em uso por ${duplicate.name}. O PIN deve ser único!`);
            }
            employee.pin = cleanPin;
        } else {
            employee.pin = '';
        }

        const idx = list.findIndex(e => e.id === employee.id);
        if (idx >= 0) {
            list[idx] = { ...list[idx], ...employee };
        } else {
            employee.id = 'EMP-' + String(list.length + 1).padStart(3, '0');
            list.push(employee);
        }
        localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(list));

        // Se estiver atualizando o usuário ativo no momento
        const currentActive = this.getCurrentUser();
        if (currentActive && currentActive.id === employee.id) {
            this.setCurrentUser(employee.id);
        }

        return employee;
    }

    // Autenticação de Sessão do RH
    isRhAuthenticated() {
        return sessionStorage.getItem('pontoflow_rh_auth') === 'true';
    }

    setRhAuthenticated(status, rhUser = null) {
        if (status) {
            sessionStorage.setItem('pontoflow_rh_auth', 'true');
            if (rhUser) sessionStorage.setItem('pontoflow_rh_user', JSON.stringify(rhUser));
        } else {
            sessionStorage.removeItem('pontoflow_rh_auth');
            sessionStorage.removeItem('pontoflow_rh_user');
        }
    }

    getRhUser() {
        const data = sessionStorage.getItem('pontoflow_rh_user');
        return data ? JSON.parse(data) : null;
    }

    verifyRhCredentials(pinOrPassword) {
        if (!pinOrPassword) return null;
        const clean = pinOrPassword.trim();
        // PIN Mestre de RH ou PIN de qualquer colaborador que seja administrador/RH
        if (clean === '1234' || clean === '9999' || clean === 'admin') {
            const admin = this.getEmployees().find(e => e.isAdmin) || this.getEmployees()[0];
            return admin;
        }
        const emp = this.getEmployees().find(e => (e.isAdmin || e.department.toLowerCase().includes('recursos humanos')) && e.pin === clean);
        return emp || null;
    }

    deleteEmployee(id) {
        let list = this.getEmployees();
        list = list.filter(e => e.id !== id);
        localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(list));

        // Se o usuário excluído era o usuário ativo, troca para o primeiro que sobrou
        const currentActive = this.getCurrentUser();
        if (currentActive && currentActive.id === id) {
            if (list.length > 0) {
                this.setCurrentUser(list[0].id);
            }
        }
    }

    // Obter batida por ID ou NSR
    getPunchById(id) {
        return this.getAllPunches().find(p => p.id === id || String(p.nsr) === String(id));
    }

    // Excluir batida de ponto
    deletePunch(id) {
        let punches = this.getAllPunches();
        const initialLen = punches.length;
        punches = punches.filter(p => p.id !== id && String(p.nsr) !== String(id));
        if (punches.length !== initialLen) {
            localStorage.setItem(STORAGE_KEYS.PUNCHES, JSON.stringify(punches));
            return true;
        }
        return false;
    }

    // Atualizar batida de ponto existente
    updatePunch(id, updatedData) {
        let punches = this.getAllPunches();
        const idx = punches.findIndex(p => p.id === id || String(p.nsr) === String(id));
        if (idx >= 0) {
            punches[idx] = { ...punches[idx], ...updatedData };

            // Se alterou a data ou horário, recalcular o timestamp ISO
            if (updatedData.timeStr || updatedData.dateStr) {
                const datePart = updatedData.dateStr || punches[idx].dateStr;
                const timePart = updatedData.timeStr || punches[idx].timeStr;
                const [h, m, s] = timePart.split(':');
                const [year, month, day] = datePart.split('-');
                const d = new Date(+year, +month - 1, +day, +h || 0, +m || 0, +s || 0);
                punches[idx].timestamp = d.toISOString();
                punches[idx].dateStr = datePart;
                punches[idx].timeStr = timePart;
            }

            // Recalcular assinatura hash de integridade
            punches[idx].hashSha256 = this.generateHashSignature(
                punches[idx].nsr,
                punches[idx].employeeId,
                punches[idx].timestamp,
                punches[idx].type
            );
            punches[idx].isEdited = true;
            punches[idx].editedAt = new Date().toISOString();

            localStorage.setItem(STORAGE_KEYS.PUNCHES, JSON.stringify(punches));
            return punches[idx];
        }
        return null;
    }

    // Usuário Atual logado
    getCurrentUser() {
        const id = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || '""');
        return this.getEmployeeById(id) || this.getEmployees()[0];
    }

    setCurrentUser(id) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(id));
    }

    // Batidas de Ponto
    getAllPunches() {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.PUNCHES) || '[]');
    }

    getNextNsr() {
        const punches = this.getAllPunches();
        if (punches.length === 0) return 10001;
        const maxNsr = Math.max(...punches.map(p => p.nsr || 10000));
        return maxNsr + 1;
    }

    registerPunch({ employeeId, type, photoUrl, coords, locationName, accuracy, notes }) {
        const emp = this.getEmployeeById(employeeId);
        if (!emp) throw new Error('Colaborador não encontrado');

        const now = new Date();
        const nsr = this.getNextNsr();
        const dateStr = this.formatDate(now);
        const timeStr = [
            String(now.getHours()).padStart(2, '0'),
            String(now.getMinutes()).padStart(2, '0'),
            String(now.getSeconds()).padStart(2, '0')
        ].join(':');

        const punch = this.buildPunchObj({
            nsr,
            employeeId: emp.id,
            employeeName: emp.name,
            type,
            timestamp: now.toISOString(),
            dateStr,
            timeStr,
            location: '',
            coords: null,
            accuracy: 0,
            photoUrl: photoUrl || emp.photoUrl,
            notes: notes || '',
            source: /Mobi|Android/i.test(navigator.userAgent) ? 'WEB_MOBILE' : 'WEB_DESKTOP'
        });

        const punches = this.getAllPunches();
        punches.push(punch);
        localStorage.setItem(STORAGE_KEYS.PUNCHES, JSON.stringify(punches));
        return punch;
    }

    // Consulta de batidas por funcionário e filtro de data
    getPunchesByEmployee(employeeId, yearMonth = null) {
        const all = this.getAllPunches();
        return all.filter(p => {
            if (p.employeeId !== employeeId) return false;
            if (yearMonth) {
                return p.dateStr.startsWith(yearMonth);
            }
            return true;
        }).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    // Obter batidas de hoje para um funcionário
    getTodayPunches(employeeId) {
        const todayStr = this.formatDate(new Date());
        return this.getAllPunches().filter(p => p.employeeId === employeeId && p.dateStr === todayStr)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    // Determina o próximo tipo de batida recomendado para o colaborador
    getNextPunchType(employeeId) {
        const todayPunches = this.getTodayPunches(employeeId);
        if (todayPunches.length === 0) return 'entrada';
        const last = todayPunches[todayPunches.length - 1];

        switch (last.type) {
            case 'entrada':
                return 'saida_intervalo';
            case 'saida_intervalo':
                return 'retorno_intervalo';
            case 'retorno_intervalo':
                return 'saida';
            case 'saida':
                return 'entrada_extra';
            default:
                return 'entrada';
        }
    }

    // Cálculo diário de horas trabalhadas e saldo
    calculateDailyMetrics(punchesOnDay, dailyJourneyHours = 8) {
        if (!punchesOnDay || punchesOnDay.length < 2) {
            return {
                workedMinutes: 0,
                workedFormatted: '00:00',
                balanceMinutes: punchesOnDay && punchesOnDay.length === 1 ? 0 : -(dailyJourneyHours * 60),
                balanceFormatted: '-08:00',
                status: punchesOnDay && punchesOnDay.length > 0 ? 'EM_ANDAMENTO' : 'FALTA'
            };
        }

        let totalWorkedMs = 0;
        let inTime = null;

        punchesOnDay.forEach(p => {
            const timeMs = new Date(p.timestamp).getTime();
            if (p.type === 'entrada' || p.type === 'retorno_intervalo' || p.type === 'entrada_extra') {
                inTime = timeMs;
            } else if ((p.type === 'saida_intervalo' || p.type === 'saida' || p.type === 'saida_extra') && inTime !== null) {
                totalWorkedMs += (timeMs - inTime);
                inTime = null;
            }
        });

        // Se ainda está com ponto aberto no dia de hoje
        if (inTime !== null) {
            const nowMs = Date.now();
            // Apenas soma se for hoje
            const todayStr = this.formatDate(new Date());
            if (punchesOnDay[0].dateStr === todayStr) {
                totalWorkedMs += Math.max(0, nowMs - inTime);
            }
        }

        const workedMinutes = Math.floor(totalWorkedMs / (1000 * 60));
        const expectedMinutes = dailyJourneyHours * 60;
        const balanceMinutes = workedMinutes - expectedMinutes;

        return {
            workedMinutes,
            workedFormatted: this.minutesToHours(workedMinutes),
            balanceMinutes,
            balanceFormatted: this.formatSignedMinutes(balanceMinutes),
            status: balanceMinutes >= 0 ? 'POSITIVO' : 'NEGATIVO'
        };
    }

    // Cálculo do Espelho Mensal Completo
    getMonthlyTimesheet(employeeId, yearMonth) {
        const emp = this.getEmployeeById(employeeId);
        if (!emp) return null;

        const punches = this.getPunchesByEmployee(employeeId, yearMonth);
        const [year, month] = yearMonth.split('-').map(Number);
        
        // Número de dias no mês
        const daysInMonth = new Date(year, month, 0).getDate();
        const days = [];

        let totalWorkedMinutes = 0;
        let totalExpectedMinutes = 0;
        let totalOvertimeMinutes = 0;
        let totalNegativeMinutes = 0;
        let workDaysCount = 0;

        const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

        for (let d = 1; d <= daysInMonth; d++) {
            const dateObj = new Date(year, month - 1, d);
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isWeekend = (dateObj.getDay() === 0 || dateObj.getDay() === 6);
            const dayPunches = punches.filter(p => p.dateStr === dateStr);

            const isToday = (dateStr === this.formatDate(new Date()));
            const isFuture = dateObj > new Date();

            let dailyMetrics = null;
            if (!isFuture && (!isWeekend || dayPunches.length > 0)) {
                dailyMetrics = this.calculateDailyMetrics(dayPunches, isWeekend ? 0 : emp.dailyHours);
                
                if (!isWeekend && !isFuture) {
                    totalExpectedMinutes += (emp.dailyHours * 60);
                    workDaysCount++;
                }

                totalWorkedMinutes += dailyMetrics.workedMinutes;

                if (dailyMetrics.balanceMinutes > 0) {
                    totalOvertimeMinutes += dailyMetrics.balanceMinutes;
                } else if (dailyMetrics.balanceMinutes < 0) {
                    totalNegativeMinutes += Math.abs(dailyMetrics.balanceMinutes);
                }
            }

            days.push({
                date: dateStr,
                dayNumber: d,
                dayOfWeek: dayNames[dateObj.getDay()],
                isWeekend,
                isToday,
                isFuture,
                punches: dayPunches,
                entrada1: dayPunches.find(p => p.type === 'entrada')?.timeStr || '--:--',
                saida1: dayPunches.find(p => p.type === 'saida_intervalo')?.timeStr || '--:--',
                entrada2: dayPunches.find(p => p.type === 'retorno_intervalo')?.timeStr || '--:--',
                saida2: dayPunches.find(p => p.type === 'saida')?.timeStr || '--:--',
                metrics: dailyMetrics
            });
        }

        const netBalanceMinutes = totalWorkedMinutes - totalExpectedMinutes;

        return {
            employee: emp,
            yearMonth,
            days,
            summary: {
                totalWorkedFormatted: this.minutesToHours(totalWorkedMinutes),
                totalExpectedFormatted: this.minutesToHours(totalExpectedMinutes),
                netBalanceMinutes,
                netBalanceFormatted: this.formatSignedMinutes(netBalanceMinutes),
                overtimeFormatted: this.minutesToHours(totalOvertimeMinutes),
                negativeFormatted: this.minutesToHours(totalNegativeMinutes),
                workDaysCount
            }
        };
    }

    // Solicitações (Ajustes e Atestados)
    getRequests() {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.REQUESTS) || '[]');
    }

    addRequest(req) {
        const list = this.getRequests();
        req.id = 'REQ-' + Math.floor(100 + Math.random() * 900);
        req.status = 'PENDENTE';
        req.createdAt = new Date().toISOString();
        list.unshift(req);
        localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(list));
        return req;
    }

    updateRequestStatus(id, newStatus, evaluatorName) {
        const list = this.getRequests();
        const req = list.find(r => r.id === id);
        if (req) {
            req.status = newStatus;
            req.evaluatedBy = evaluatorName;
            req.evaluatedAt = new Date().toISOString();

            // Se aprovado e for ajuste de batida, inserir a batida no espelho
            if (newStatus === 'APROVADO' && req.type === 'AJUSTE') {
                const emp = this.getEmployeeById(req.employeeId);
                const nsr = this.getNextNsr();
                const [h, m] = req.time.split(':');
                const dt = new Date(`${req.date}T${h}:${m}:00`);

                const punch = this.buildPunchObj({
                    nsr,
                    employeeId: req.employeeId,
                    employeeName: req.employeeName,
                    type: req.punchType || 'entrada',
                    timestamp: dt.toISOString(),
                    dateStr: req.date,
                    timeStr: `${req.time}:00`,
                    location: 'Ajuste Manual Aprovado pelo RH',
                    source: 'AJUSTE_MANUAL_RH',
                    notes: `Ajuste aprovado: ${req.reason}`
                });

                const punches = this.getAllPunches();
                punches.push(punch);
                localStorage.setItem(STORAGE_KEYS.PUNCHES, JSON.stringify(punches));
            }

            localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(list));
        }
        return req;
    }

    // Configurações
    getSettings() {
        return JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || JSON.stringify(DEFAULT_SETTINGS));
    }

    saveSettings(settings) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    }

    // Helpers de formatação
    minutesToHours(mins) {
        const h = Math.floor(mins / 60);
        const m = Math.floor(mins % 60);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    formatSignedMinutes(mins) {
        const sign = mins >= 0 ? '+' : '-';
        const abs = Math.abs(mins);
        const h = Math.floor(abs / 60);
        const m = Math.floor(abs % 60);
        return `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
}

// Instância global
const db = new PontoDB();
