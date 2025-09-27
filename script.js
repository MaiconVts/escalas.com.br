// Espera o conteúdo da página carregar completamente para rodar o script
document.addEventListener('DOMContentLoaded', () => {

    // --- ESTADO INICIAL BASE (Apenas a ordem dos grupos) ---
    // Esta é a referência original para o Reset.
    const ESTADO_BASE_SETEMBRO = {
        // A ordem representa a folga da última semana de Setembro: [Sexta, Sábado, Domingo]
        ordemDosGrupos: ['grupoA', 'grupoB', 'grupoC']
    };

    // --- ESTADO ATUAL (MUTÁVEL) ---
    // Guarda a ORDEM de folga do último mês gerado.
    let estadoAtual = JSON.parse(JSON.stringify(ESTADO_BASE_SETEMBRO));

    // --- ELEMENTOS DO DOM (Interface) ---
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

    gerarEscalaBtn.addEventListener('click', () => {
        const mes = parseInt(mesInput.value);
        const ano = parseInt(anoInput.value);
        const freelancer1 = freelancer1Input.value.trim();
        const freelancer2 = freelancer2Input.value.trim();
        
        // 1. Pega os nomes dos funcionários que estão NA TELA no momento do clique.
        const nomesDosGrupos = getGruposFromUI();

        // 2. Gera os dados da escala, passando o ESTADO ATUAL (continuidade) e os NOMES (da tela).
        const dadosEscala = gerarDadosDaEscala(ano, mes, freelancer1, freelancer2, estadoAtual, nomesDosGrupos);
        
        // 3. ATUALIZA O ESTADO GLOBAL com a nova ordem para o próximo mês.
        estadoAtual = dadosEscala.estadoFinal;

        // 4. Renderiza o calendário na tela.
        renderizarCalendario(dadosEscala);
    });

    resetBtn.addEventListener('click', () => {
        if (confirm('Isso irá resetar a ordem das folgas para a configuração original de Setembro de 2025. Deseja continuar?')) {
            // Reseta apenas a ORDEM, os nomes na tela não são alterados.
            estadoAtual = JSON.parse(JSON.stringify(ESTADO_BASE_SETEMBRO));
            calendarioContainer.innerHTML = '<div class="alert alert-info">Ordem das folgas resetada. Gere uma nova escala.</div>';
            alert('Ordem das folgas resetada com sucesso!');
        }
    });

    // --- FUNÇÕES DE LÓGICA ---

    /**
     * Lê os nomes dos funcionários dos inputs e retorna um objeto mapeando o ID do grupo aos nomes.
     */
    function getGruposFromUI() {
        return {
            grupoA: inputsGrupoA.map(input => input.value.trim()).filter(Boolean),
            grupoB: inputsGrupoB.map(input => input.value.trim()).filter(Boolean),
            grupoC: inputsGrupoC.map(input => input.value.trim()).filter(Boolean)
        };
    }
    
    /**
     * Orquestra a geração dos dados do mês.
     */
    function gerarDadosDaEscala(ano, mes, freelancer1, freelancer2, estadoInicialDoMes, nomesDosGrupos) {
        const mesJS = mes - 1;
        const diasNoMes = new Date(ano, mes, 0).getDate();
        const primeiroDiaSemana = new Date(ano, mesJS, 1).getDay();

        let dias = [];
        for (let i = 1; i <= diasNoMes; i++) {
            const data = new Date(ano, mesJS, i);
            dias.push({ data: data, dia: i, diaSemana: data.getDay(), folgas: [], freelancers: [] });
        }
        
        const estadoFinal = calcularRotacaoPrincipal(dias, estadoInicialDoMes, nomesDosGrupos);

        if (freelancer1) calcularEscalaFreelancer(dias, freelancer1);
        if (freelancer2) calcularEscalaFreelancer(dias, freelancer2, true);

        const nomeMes = new Date(ano, mesJS, 1).toLocaleString('pt-BR', { month: 'long' });

        return { ano, mes, nomeMes, dias, primeiroDiaSemana, estadoFinal };
    }

    /**
     * LÓGICA DE ROTAÇÃO PRINCIPAL - **VERSÃO FINAL E CORRIGIDA**
     */
    function calcularRotacaoPrincipal(diasDoMes, estadoInicial, nomesDosGrupos) {
        // 1. Faz uma cópia da ORDEM dos grupos do estado anterior.
        let ordemDaSemana = [...estadoInicial.ordemDosGrupos];

        // 2. ROTAÇÃO INICIAL: Prepara a ordem para a PRIMEIRA semana do mês.
        // O último grupo (que folgou no Domingo) passa a ser o primeiro (folgará na Sexta).
        ordemDaSemana.unshift(ordemDaSemana.pop());

        diasDoMes.forEach(diaInfo => {
            const idGrupoSexta = ordemDaSemana[0];
            const idGrupoSabado = ordemDaSemana[1];
            const idGrupoDomingo = ordemDaSemana[2];

            if (diaInfo.diaSemana === 5) { // Sexta-feira
                diaInfo.folgas.push({ tipo: 'sexta', grupo: nomesDosGrupos[idGrupoSexta] });
            } else if (diaInfo.diaSemana === 6) { // Sábado
                diaInfo.folgas.push({ tipo: 'sabado', grupo: nomesDosGrupos[idGrupoSabado] });
            } else if (diaInfo.diaSemana === 0) { // Domingo
                diaInfo.folgas.push({ tipo: 'domingo', grupo: nomesDosGrupos[idGrupoDomingo] });

                // 3. APÓS o Domingo, rotaciona a ORDEM para a PRÓXIMA semana.
                ordemDaSemana.unshift(ordemDaSemana.pop());
            }
        });

        // 4. Retorna a ORDEM final, que será o estado inicial para o próximo mês.
        return { ordemDosGrupos: ordemDaSemana };
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
