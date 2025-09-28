document.addEventListener('DOMContentLoaded', () => {
    // --- ESTADO INICIAL E PERSISTÊNCIA ---
    const ESTADO_BASE_SETEMBRO = { ordemDosGrupos: ['grupoA', 'grupoB', 'grupoC'] };
    let estadoAtual = carregarEstado();
    // Variável para guardar os dados da última escala gerada
    let dadosDaEscalaAtual = null;

    // --- MAPEAMENTO DE ELEMENTOS DO DOM ---
    const mesInput = document.getElementById('mes');
    const anoInput = document.getElementById('ano');
    const freelancer1Input = document.getElementById('freelancer1');
    const freelancer2Input = document.getElementById('freelancer2');
    const gerarEscalaBtn = document.getElementById('gerar-escala-btn');
    const resetBtn = document.getElementById('reset-btn');
    const exportExcelBtn = document.getElementById('export-excel-btn');
    const calendarioContainer = document.getElementById('calendario-container');
    const inputsGrupoA = [document.getElementById('grupoA-func1'), document.getElementById('grupoA-func2'), document.getElementById('grupoA-func3'), document.getElementById('grupoA-func4')];
    const inputsGrupoB = [document.getElementById('grupoB-func1'), document.getElementById('grupoB-func2'), document.getElementById('grupoB-func3'), document.getElementById('grupoB-func4')];
    const inputsGrupoC = [document.getElementById('grupoC-func1'), document.getElementById('grupoC-func2'), document.getElementById('grupoC-func3'), document.getElementById('grupoC-func4')];
    const helpers = {
        grupoA: document.getElementById('helper-grupoA'),
        grupoB: document.getElementById('helper-grupoB'),
        grupoC: document.getElementById('helper-grupoC')
    };

    // --- INICIALIZAÇÃO DA PÁGINA ---
    atualizarLabelsUI(estadoAtual);

    // --- EVENTOS ---
    gerarEscalaBtn.addEventListener('click', () => {
        const mes = parseInt(mesInput.value);
        const ano = parseInt(anoInput.value);
        const freelancer1 = freelancer1Input.value.trim();
        const freelancer2 = freelancer2Input.value.trim();
        const nomesDosGrupos = getGruposFromUI();

        const dadosEscala = gerarDadosDaEscala(ano, mes, freelancer1, freelancer2, estadoAtual, nomesDosGrupos);

        estadoAtual = dadosEscala.estadoFinal;
        dadosDaEscalaAtual = dadosEscala;
        salvarEstado(estadoAtual);
        atualizarLabelsUI(estadoAtual);
        renderizarCalendario(dadosEscala);

        exportExcelBtn.disabled = false;
    });

    resetBtn.addEventListener('click', () => {
        if (confirm('Isso irá resetar a ordem das folgas para a configuração original. Deseja continuar?')) {
            localStorage.removeItem('escala_estado');
            estadoAtual = JSON.parse(JSON.stringify(ESTADO_BASE_SETEMBRO));
            dadosDaEscalaAtual = null;
            atualizarLabelsUI(estadoAtual);
            calendarioContainer.innerHTML = '<div class="alert alert-info">Ordem das folgas resetada. Gere uma nova escala.</div>';
            exportExcelBtn.disabled = true;
            alert('Ordem das folgas resetada com sucesso!');
        }
    });

    exportExcelBtn.addEventListener('click', () => {
        if (dadosDaEscalaAtual) {
            exportarParaExcel(dadosDaEscalaAtual);
        } else {
            alert('Gere uma escala antes de exportar.');
        }
    });

    // --- FUNÇÕES DE LÓGICA ---

    function carregarEstado() {
        const estadoSalvo = localStorage.getItem('escala_estado');
        return estadoSalvo ? JSON.parse(estadoSalvo) : JSON.parse(JSON.stringify(ESTADO_BASE_SETEMBRO));
    }

    function salvarEstado(estado) {
        localStorage.setItem('escala_estado', JSON.stringify(estado));
    }

    function atualizarLabelsUI(estado) {
        const diasSemana = {
            [estado.ordemDosGrupos[0]]: "Sexta-feira",
            [estado.ordemDosGrupos[1]]: "Sábado",
            [estado.ordemDosGrupos[2]]: "Domingo"
        };
        helpers.grupoA.textContent = `(Última folga na ${diasSemana.grupoA})`;
        helpers.grupoB.textContent = `(Última folga no ${diasSemana.grupoB})`;
        helpers.grupoC.textContent = `(Última folga no ${diasSemana.grupoC})`;
    }

    function getGruposFromUI() {
        return {
            grupoA: inputsGrupoA.map(input => input.value.trim()).filter(Boolean),
            grupoB: inputsGrupoB.map(input => input.value.trim()).filter(Boolean),
            grupoC: inputsGrupoC.map(input => input.value.trim()).filter(Boolean)
        };
    }

    function gerarDadosDaEscala(ano, mes, freelancer1, freelancer2, estadoInicialDoMes, nomesDosGrupos) {
        const mesJS = mes - 1;
        const diasNoMes = new Date(ano, mes, 0).getDate();
        const primeiroDiaSemana = new Date(ano, mesJS, 1).getDay();
        const todosFuncionarios = [...nomesDosGrupos.grupoA, ...nomesDosGrupos.grupoB, ...nomesDosGrupos.grupoC];

        let dias = [];
        for (let i = 1; i <= diasNoMes; i++) {
            dias.push({ data: new Date(ano, mesJS, i), dia: i, diaSemana: new Date(ano, mesJS, i).getDay(), folgas: [], trabalham: [], freelancers: [] });
        }

        const estadoFinal = calcularRotacaoPrincipal(dias, estadoInicialDoMes, nomesDosGrupos, todosFuncionarios);

        // --- LÓGICA DOS FREELANCERS CORRIGIDA ---
        // A lógica agora é integrada aqui para garantir que ambos sigam o mesmo ciclo.
        if (freelancer1 || freelancer2) {
            let trabalhaHoje = false; // Começam o ciclo do mês com folga no primeiro dia útil.
            dias.forEach(diaInfo => {
                // O mesmo status é calculado para ambos
                const status = (diaInfo.diaSemana === 0) ? 'Folga' : (trabalhaHoje ? 'Trabalha' : 'Folga');

                // E aplicado individualmente a cada um, se existirem
                if (freelancer1) diaInfo.freelancers.push({ nome: freelancer1, status });
                if (freelancer2) diaInfo.freelancers.push({ nome: freelancer2, status });

                // O ciclo dia-sim/dia-não avança para o próximo dia para AMBOS ao mesmo tempo
                trabalhaHoje = !trabalhaHoje;
            });
        }
        // --- FIM DA LÓGICA CORRIGIDA ---

        const nomeMes = new Date(ano, mesJS, 1).toLocaleString('pt-BR', { month: 'long' });

        return { ano, mes, nomeMes, dias, primeiroDiaSemana, estadoFinal };
    }

    function calcularRotacaoPrincipal(diasDoMes, estadoInicial, nomesDosGrupos, todosFuncionarios) {
        let ordemDaSemana = [...estadoInicial.ordemDosGrupos];
        ordemDaSemana.unshift(ordemDaSemana.pop());

        diasDoMes.forEach(diaInfo => {
            let grupoDeFolgaID = null;
            if (diaInfo.diaSemana === 5) grupoDeFolgaID = ordemDaSemana[0];
            else if (diaInfo.diaSemana === 6) grupoDeFolgaID = ordemDaSemana[1];
            else if (diaInfo.diaSemana === 0) grupoDeFolgaID = ordemDaSemana[2];

            if (grupoDeFolgaID) {
                const grupoDeFolgaNomes = nomesDosGrupos[grupoDeFolgaID];
                diaInfo.folgas = grupoDeFolgaNomes;
                diaInfo.trabalham = todosFuncionarios.filter(func => !grupoDeFolgaNomes.includes(func));
            }

            if (diaInfo.diaSemana === 0) ordemDaSemana.unshift(ordemDaSemana.pop());
        });
        return { ordemDosGrupos: ordemDaSemana };
    }

    function exportarParaExcel(dados) {
        const diasDaSemanaNomes = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
        let linhasDaPlanilha = [];
        linhasDaPlanilha.push(["Data", "Dia da Semana", "Status", "Funcionário"]);

        dados.dias.forEach(dia => {
            const dataFormatada = dia.data.toLocaleDateString('pt-BR');
            const nomeDiaSemana = diasDaSemanaNomes[dia.diaSemana];

            dia.folgas.forEach(funcionario => {
                linhasDaPlanilha.push([dataFormatada, nomeDiaSemana, "Folga", funcionario]);
            });
            dia.trabalham.forEach(funcionario => {
                linhasDaPlanilha.push([dataFormatada, nomeDiaSemana, "Trabalho", funcionario]);
            });
            dia.freelancers.forEach(f => {
                linhasDaPlanilha.push([dataFormatada, nomeDiaSemana, `Freelancer: ${f.status}`, f.nome]);
            });
        });

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet(linhasDaPlanilha);
        worksheet["!cols"] = [{ wch: 12 }, { wch: 15 }, { wch: 20 }, { wch: 25 }];
        XLSX.utils.book_append_sheet(workbook, worksheet, "Escala Mensal");
        const nomeArquivo = `Escala_${dados.nomeMes}_${dados.ano}.xlsx`;
        XLSX.writeFile(workbook, nomeArquivo);
    }

    function renderizarCalendario(dados) {
        let html = `
            <div class="text-center"><h2>Escala de ${dados.nomeMes.charAt(0).toUpperCase() + dados.nomeMes.slice(1)} de ${dados.ano}</h2></div>
            <div class="calendario-grid mt-3">
                <div class="header-dia">Dom</div><div class="header-dia">Seg</div><div class="header-dia">Ter</div><div class="header-dia">Qua</div><div class="header-dia">Qui</div><div class="header-dia">Sex</div><div class="header-dia">Sáb</div>`;

        const diasNoMesAnterior = new Date(dados.ano, dados.mes - 1, 0).getDate();
        for (let i = dados.primeiroDiaSemana; i > 0; i--) {
            html += `<div class="dia-celula outro-mes"><div class="dia-numero">${diasNoMesAnterior - i + 1}</div></div>`;
        }

        dados.dias.forEach(dia => {
            html += `<div class="dia-celula"><div class="dia-numero">${dia.dia}</div>`;
            if (dia.folgas.length > 0) {
                html += `<ul class="lista-folgas"><strong>Folgas:</strong>`;
                dia.folgas.forEach(pessoa => {
                    // Pequeno ajuste para aplicar a cor correta da folga do dia
                    let tipoFolga = '';
                    if (dia.diaSemana === 5) tipoFolga = 'sexta';
                    else if (dia.diaSemana === 6) tipoFolga = 'sabado';
                    else if (dia.diaSemana === 0) tipoFolga = 'domingo';
                    html += `<li class="folga-${tipoFolga}">${pessoa}</li>`;
                });
                html += `</ul>`;
            }
            if (dia.trabalham.length > 0) {
                html += `<ul class="lista-trabalham"><strong>Trabalham:</strong>`;
                dia.trabalham.forEach(pessoa => { html += `<li class="trabalha-item">${pessoa}</li>`; });
                html += `</ul>`;
            }
            if (dia.freelancers.length > 0) {
                html += `<ul class="lista-trabalham"><strong>Freelancers:</strong>`;
                dia.freelancers.forEach(f => {
                    const classe = f.status === 'Trabalha' ? 'freelancer-trabalha' : 'freelancer-folga';
                    html += `<li class="freelancer-item ${classe}">${f.nome}: ${f.status}</li>`;
                });
                html += `</ul>`;
            }
            html += `</div>`;
        });

        const totalCelulas = dados.primeiroDiaSemana + dados.dias.length;
        const celulasFaltantes = (totalCelulas % 7 === 0) ? 0 : 7 - (totalCelulas % 7);
        for (let i = 1; i <= celulasFaltantes; i++) {
            html += `<div class="dia-celula outro-mes"><div class="dia-numero">${i}</div></div>`;
        }

        html += `</div>`;
        calendarioContainer.innerHTML = html;
    }
});