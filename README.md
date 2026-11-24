# 🕒 PontoFlow Pro — Sistema Web de Ponto Eletrônico Inteligente

> Sistema web moderno, 100% responsivo e intuitivo para **Registro e Gestão de Ponto Eletrônico de Funcionários**, desenvolvido em conformidade com as diretrizes da **Portaria MTE nº 671/2021** e da **CLT (Art. 74)**.

---

## 📋 Sobre o Projeto

O **PontoFlow Pro** foi projetado para atender tanto empresas que necessitam de um terminal/totem de registro rápido de ponto com foto na entrada, quanto os departamentos de **Recursos Humanos (RH)** que precisam gerenciar o espelho de ponto, aprovar solicitações de ajuste, gerenciar colaboradores e emitir relatórios para homologação de folha.

### 🌟 Destaques da Solução:
- **Sem dependências externas pesadas**: Roda 100% no navegador (Single Page Application) e com servidor HTTP nativo Node.js opcional.
- **Captura Fotográfica Instantânea**: A foto do colaborador é capturada pela webcam e vinculada ao carimbo oficial de data, hora e NSR.
- **Relógio Digital em Tempo Real**: Mostrador com segundos e sincronização com o horário oficial de Brasília.
- **Acesso Restrito ao RH**: Terminal protegido por PIN/senha de gestão, ocultando ações de edição, exclusão e dados sensíveis de funcionários não autorizados.
- **PIN Único Obrigatório**: Validação estrita para impedir duplicidade de PINs entre funcionários.
- **Espelho de Ponto Individual**: Cálculo automático de saldo de banco de horas (+ / -) e folha A4 oficial pronta para impressão física e assinatura.

---

## ✨ Funcionalidades Principais

### 1. ⏱️ Registro de Ponto com Foto (Kiosk & Autoatendimento)
- **Seleção Visual do Colaborador**: Cartões destacados com foto de perfil, nome, cargo, matrícula e indicador de status (🟢 Trabalhando, 🟡 Em Almoço, ⚪ Fora).
- **Disparo com 1 Clique**: Ao clicar no colaborador, a webcam dispara a foto instantânea e registra o ponto de imediato.
- **Identificação da Próxima Batida**: O sistema sugere automaticamente a sequência da jornada (`Entrada` ➔ `Intervalo` ➔ `Retorno` ➔ `Saída`).
- **Comprovante de Registro (Portaria 671 MTE)**:
  - Número Sequencial de Registro (**NSR**) imutável e crescente.
  - Foto do trabalhador no ato da batida.
  - Carimbo de data e hora oficial.
  - Assinatura digital criptográfica em hash SHA-256 de autenticidade.
  - Botão de impressão do recibo.
- **Feedback Sonoro**: Acordes harmônicos via *Web Audio API* confirmando o registro.

### 2. 🔐 Acesso Restrito do RH
- Botão **`[ Acesso RH ]`** no cabeçalho com autenticação por PIN ou senha.
- Desbloqueia as abas administrativas:
  - **Gestão RH**: Indicadores de presença em tempo real, gráfico analítico semanal de horas trabalhadas e cadastro de funcionários.
  - **Solicitações**: Central de aprovação/rejeição de justificativas de esquecimento de ponto e atestados médicos.
  - **Espelho de Ponto**: Consulta mensal de qualquer funcionário.
  - **Ações Avançadas**: Botões de visualizar foto, editar e excluir batidas e perfis.

### 3. 👤 Gestão Completa de Funcionários e Fotos
- Cadastro e edição completa de colaboradores (Nome, Cargo, Departamento, CPF, Matrícula, Carga Horária diária e PIN único).
- **Foto de Perfil Flexível**:
  - Upload de arquivos de imagem locais (`.png`, `.jpg`, `.webp`) com leitura em Base64.
  - Captura direta de foto pela webcam do computador/celular.
  - Inserção de link direto/URL da foto.

### 4. 📅 Espelho de Ponto (Timesheet) & Exportação
- Resumo mensal: Horas trabalhadas, carga prevista e saldo de banco de horas (+ / -).
- **Impressão Oficial A4**: Formatação com folhas de estilo `@media print` contendo dados da empresa, colaborador, tabela de registros e linhas de assinatura do empregado e empregador.
- **Exportação CSV**: Exportação com 1 clique compatível com Microsoft Excel, Google Sheets e sistemas de folha de pagamento.

### 5. 📱 Modo Totem (Tablet de Entrada)
- Interface fullscreen touch ideal para tablets fixados na recepção.
- Teclado numérico virtual para digitação de PIN ou matrícula com registro rápido com foto e reinicialização automática de tela.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: HTML5 Semântico, Tailwind CSS (Design System responsivo), Font Awesome 6.
- **Gráficos**: Chart.js para análise de volumetria de horas trabalhadas da equipe.
- **Multimídia & Hardware**:
  - `navigator.mediaDevices.getUserMedia` para biometria facial e captura na webcam.
  - `Web Audio API` para sintetização harmônica de áudio nativa (sem arquivos de áudio pesados).
- **Persistência**: `LocalStorage` estruturado com inicialização de dados semente (*seed data*).
- **Backend (Opcional)**: Servidor HTTP em Node.js puro (`server.js`) sem qualquer biblioteca externa.

---

## 🚀 Como Instalar e Rodar

### Pré-requisitos
- Um navegador moderno (Google Chrome, Microsoft Edge, Mozilla Firefox ou Safari).
- *(Opcional)* Node.js v16+ instalado para execução via terminal.

### Opção 1: Uso Imediato (Sem instalação)
1. Baixe ou clone o repositório:
   ```bash
   git clone https://github.com/jAlvarosf/pontoflow-pro.git
   ```
2. Abra o arquivo `index.html` diretamente em seu navegador (dando duplo clique no arquivo).

### Opção 2: Servidor Local via Node.js
1. Clone o repositório e acesse a pasta:
   ```bash
   git clone https://github.com/jAlvarosf/pontoflow-pro.git
   cd pontoflow-pro
   ```
2. Inicie o servidor:
   ```bash
   npm start
   # ou
   node server.js
   ```
3. Abra em seu navegador:
   ```
   http://localhost:3000
   ```

---

## 🔑 Credenciais Padrão de Demonstração

- **Acesso do RH**:
  - Clique em **`[ Acesso RH ]`** no topo.
  - PIN Padrão: `1234` (ou qualquer PIN de colaborador administrador).
- **Colaboradores Cadastrados**:
  - Ana Carolina Ribeiro (TI) — PIN: `1234`
  - Lucas Gabriel Silveira (TI) — PIN: `2345`
  - Mariana Duarte Costa (RH) — PIN: `3456`
  - Rodrigo Mendonça Prado (Design) — PIN: `4567`
  - Camila Beatriz Farias (Comercial) — PIN: `5678`

---

## 📂 Estrutura de Arquivos

```text
pontoflow-pro/
├── css/
│   └── styles.css        # Animações de scanner, estilos de recibo térmico e impressão A4
├── js/
│   ├── app.js            # Controlador principal de UI, relógio, áudio, câmera e modais
│   └── database.js       # Camada de dados, LocalStorage, Portaria 671 e cálculos de jornada
├── index.html            # Aplicação SPA responsiva (Tailwind CSS, Font Awesome, Chart.js)
├── server.js             # Servidor HTTP local leve em Node.js (sem dependências)
├── package.json          # Metadados e scripts do projeto
├── .gitignore            # Arquivos ignorados pelo Git
└── README.md             # Documentação completa
```

---

## ⚖️ Conformidade Legal
Este sistema foi arquitetado com base nas diretrizes conceituais da **Portaria MTE nº 671/2021** (REP-P / REP-A) e do **Artigo 74 da CLT**, implementando comprovantes com assinatura digital SHA-256 e numeração sequencial (NSR).

---

## 📄 Licença
Distribuído sob a licença **MIT**. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.
