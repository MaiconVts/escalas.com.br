// Espera o conteúdo da página carregar completamente para rodar o script
document.addEventListener('DOMContentLoaded', () => {

    // --- ESTADO INICIAL BASE ---
    // Este objeto NUNCA muda. É a nossa referência original para o Reset.
    const ESTADO_BASE_SETEMBRO = {
        // A ordem aqui é crucial: [Grupo da Sexta, Grupo do Sábado, Grupo do Domingo]
        gruposEmOrdemDeFolga: [
            ['Maicon', 'Iranilda', 'Valeria'], // Grupo A
            ['Elida', 'Ingred', 'Daiane'],      // Grupo B
            ['Stefany', 'Ana Flavia', 'Luciana', 'Isadora'] // Grupo C
        ]
    };

    // --- ESTADO ATUAL (MUTÁVEL) ---
    // Esta variável vai guardar o estado final do último mês gerado.
    // Começa como uma cópia do estado base.
    let estadoAtual = JSON.parse(JSON.stringify(ESTADO_BASE_SETEMBRO));

    // --- ELEMENTOS DO DOM (Interface) ---
    // Mapeamento de todos os inputs e botões
    const mesInput = document.getElementById('mes');
    const anoInput = document.getElementById('ano');
    const freelancer1Input = document.getElementById('freelancer1');
    const freelancer2Input = document.getElementById('freelancer2');
    const gerarEscalaBtn = document.getElementById('gerar-escala-btn');
    const resetBtn = document.getElementById('reset-btn');
    const calendarioContainer = document.getElementById('calendario-container');
    const inputsGrupoA = [document.getElementById('grupoA-func1'), document.getElementById('grupoA-func2'), document.getElementById('grupoA-func3')];
    const inputsGrupoB = [document.getElementById('grupoB-func1'), document.getElementById('grupoB-func2'), document.getElementById('grupoB-func3')];
    const inputsGrupoC = [document.getElementById('grupoC-func1'), document.getElementById('grupoC-func2'), document.getElementById('grupoC-func3'), document.getElementById('grupoC-func4')];

    // --- EVENTOS PRINCIPAIS ---

    // Evento para o botão GERAR ESCALA
    gerarEscalaBtn.addEventListener('click', () => {
        // 1. Pega os dados da interface (mês, ano, nomes)
        const mes = parseInt(mesInput.value);
        const ano = parseInt(anoInput.value);
        const freelancer1 = freelancer1Input.value.trim();
        const freelancer2 = freelancer2Input.value.trim();
        const gruposDaUI = getGruposFromUI();

        // Atualiza o estado base com os nomes da UI, caso tenham mudado
        estadoAtual.gruposEmOrdemDeFolga = gruposDaUI;

        // 2. Gera os dados da escala, passando o estado atual
        const dadosEscala = gerarDadosDaEscala(ano, mes, freelancer1, freelancer2, estadoAtual);
        
        // 3. ATUALIZA O ESTADO GLOBAL para o próximo mês
        estadoAtual = dadosEscala.estadoFinal;

        // 4. Renderiza o calendário na tela
        renderizarCalendario(dadosEscala);
    });

    // Evento para o botão RESETAR
    resetBtn.addEventListener('click', () => {
        if (confirm('Isso irá resetar o estado da escala para a configuração original de Setembro de 2025. Deseja continuar?')) {
            estadoAtual = JSON.parse(JSON.stringify(ESTADO_BASE_SETEMBRO));
            
            // Reseta os campos de nome para os valores originais
            inputsGrupoA.forEach((input, i) => input.value = ESTADO_BASE_SETEMBRO.gruposEmOrdemDeFolga[0][i] || '');
            inputsGrupoB.forEach((input, i) => input.value = ESTADO_BASE_SETEMBRO.gruposEmOrdemDeFolga[1][i] || '');
            inputsGrupoC.forEach((input, i) => input.value = ESTADO_BASE_SETEMBRO.gruposEmOrdemDeFolga[2][i] || '');
            
            calendarioContainer.innerHTML = '<div class="alert alert-info">Estado resetado. Preencha os dados e gere uma nova escala.</div>';
            alert('Estado da escala resetado com sucesso!');
        }
    });

    // --- FUNÇÕES DE LÓGICA ---

    /**
     * Lê os nomes dos funcionários dos campos de input e os retorna estruturados.
     */
    function getGruposFromUI() {
        const grupoA = inputsGrupoA.map(input => input.value.trim()).filter(Boolean);
        const grupoB = inputsGrupoB.map(input => input.value.trim()).filter(Boolean);
        const grupoC = inputsGrupoC.map(input => input.value.trim()).filter(Boolean);
        return [grupoA, grupoB, grupoC];
    }
    
    /**
     * Orquestra a geração de todos os dados necessários para a escala do mês.
     */
    function gerarDadosDaEscala(ano, mes, freelancer1, freelancer2, estadoInicialDoMes) {
        const mesJS = mes - 1; // Mês no JS é 0-indexado
        const diasNoMes = new Date(ano, mes, 0).getDate();
        const primeiroDiaSemana = new Date(ano, mesJS, 1).getDay();

        let dias = [];
        for (let i = 1; i <= diasNoMes; i++) {
            const data = new Date(ano, mesJS, i);
            dias.push({
                data: data,
                dia: i,
                diaSemana: data.getDay(),
                folgas: [],
                freelancers: []
            });
        }
        
        // **LÓGICA CORRIGIDA**
        // A função de rotação agora retorna o estado final para ser usado no próximo mês.
        const estadoFinal = calcularRotacaoPrincipal(dias, estadoInicialDoMes);

        if (freelancer1) calcularEscalaFreelancer(dias, freelancer1);
        if (freelancer2) calcularEscalaFreelancer(dias, freelancer2, true);

        const nomeMes = new Date(ano, mesJS, 1).toLocaleString('pt-BR', { month: 'long' });

        return { ano, mes, nomeMes, dias, primeiroDiaSemana, estadoFinal };
    }

    /**
     * LÓGICA DE ROTAÇÃO PRINCIPAL - **TOTALMENTE REESCRITA E CORRIGIDA**
     */
    function calcularRotacaoPrincipal(diasDoMes, estadoInicial) {
        // Faz uma cópia dos grupos para poder manipular
        let gruposDaSemana = JSON.parse(JSON.stringify(estadoInicial.gruposEmOrdemDeFolga));

        // ROTAÇÃO INICIAL: O estado que recebemos é do mês anterior.
        // A primeira coisa a fazer é rotacionar para a primeira semana do mês atual.
        // O último grupo (Domingo) vai para o início (Sexta).
        gruposDaSemana.unshift(gruposDaSemana.pop());

        diasDoMes.forEach(diaInfo => {
            // Associa os grupos aos dias de folga da semana atual
            if (diaInfo.diaSemana === 5) { // Sexta-feira
                diaInfo.folgas.push({ tipo: 'sexta', grupo: gruposDaSemana[0] });
            } else if (diaInfo.diaSemana === 6) { // Sábado
                diaInfo.folgas.push({ tipo: 'sabado', grupo: gruposDaSemana[1] });
            } else if (diaInfo.diaSemana === 0) { // Domingo
                diaInfo.folgas.push({ tipo: 'domingo', grupo: gruposDaSemana[2] });

                // APÓS O DOMINGO, rotacionamos a ordem para a PRÓXIMA semana.
                gruposDaSemana.unshift(gruposDaSemana.pop());
            }
        });

        // Retorna o estado final dos grupos após o último fim de semana,
        // que será o estado inicial para o próximo mês.
        return { gruposEmOrdemDeFolga: gruposDaSemana };
    }

    /**
     * Calcula a escala de um freelancer (dia sim, dia não).
     */
    function calcularEscalaFreelancer(diasDoMes, nome, comecarTrabalhando = false) {
        let trabalhaHoje = comecarTrabalhando; 
        diasDoMes.forEach(diaInfo => {
            let status = '';
            if (diaInfo.diaSemana === 0) {
                status = 'Folga';
            } else {
                status = trabalhaHoje ? 'Trabalha' : 'Folga';
            }
            diaInfo.freelancers.push({ nome, status });
            trabalhaHoje = !trabalhaHoje;
        });
    }

    // --- FUNÇÕES DE RENDERIZAÇÃO (VISUAL) ---
    // (Sem alterações, apenas copiada para integridade)
    function renderizarCalendario(dados) {
        let html = `
            <div class="text-center">
                <h2>Escala de ${dados.nomeMes.charAt(0).toUpperCase() + dados.nomeMes.slice(1)} de ${dados.ano}</h2>
            </div>
            <div class="calendario-grid mt-3">
                <div class="header-dia">Dom</div>
                <div class="header-dia">Seg</div>
                <div class="header-dia">Ter</div>
                <div class="header-dia">Qua</div>
                <div class="header-dia">Qui</div>
                <div class="header-dia">Sex</div>
                <div class="header-dia">Sáb</div>`;

        for (let i = 0; i < dados.primeiroDiaSemana; i++) {
            html += `<div class="dia-celula outro-mes"></div>`;
        }

        dados.dias.forEach(dia => {
            html += `<div class="dia-celula">`;
            html += `<div class="dia-numero">${dia.dia}</div>`;

            if (dia.folgas.length > 0) {
                const folga = dia.folgas[0];
                html += `<ul class="lista-folgas"><strong>Folgas:</strong>`;
                folga.grupo.forEach(pessoa => {
                    html += `<li class="folga-${folga.tipo}">${pessoa}</li>`;
                });
                html += `</ul>`;
            }

            if (dia.freelancers.length > 0) {
                 html += `<ul class="lista-folgas"><strong>Freelancers:</strong>`;
                 dia.freelancers.forEach(f => {
                     const classe = f.status === 'Trabalha' ? 'freelancer-trabalha' : 'freelancer-folga';
                     html += `<li class="freelancer-item ${classe}">${f.nome}: ${f.status}</li>`;
                 });
                 html += `</ul>`;
            }
            html += `</div>`;
        });

        html += `</div>`;
        calendarioContainer.innerHTML = html;
    }
});
