document.addEventListener('DOMContentLoaded', () => {
    const ESTADO_BASE_SETEMBRO = {
        ordemDosGrupos: ['grupoA', 'grupoB', 'grupoC'] // Sexta, Sábado, Domingo
    };

    let estadoAtual = carregarEstado();

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
    const helpers = {
        grupoA: document.getElementById('helper-grupoA'),
        grupoB: document.getElementById('helper-grupoB'),
        grupoC: document.getElementById('helper-grupoC')
    };

    atualizarLabelsUI(estadoAtual);

    gerarEscalaBtn.addEventListener('click', () => {
        const mes = parseInt(mesInput.value);
        const ano = parseInt(anoInput.value);
        const freelancer1 = freelancer1Input.value.trim();
        const freelancer2 = freelancer2Input.value.trim();
        const nomesDosGrupos = getGruposFromUI();

        const dadosEscala = gerarDadosDaEscala(ano, mes, freelancer1, freelancer2, estadoAtual, nomesDosGrupos);
        
        estadoAtual = dadosEscala.estadoFinal;
        salvarEstado(estadoAtual);
        atualizarLabelsUI(estadoAtual);
        renderizarCalendario(dadosEscala);
    });

    resetBtn.addEventListener('click', () => {
        if (confirm('Isso irá resetar a ordem das folgas para a configuração original de Setembro de 2025. Deseja continuar?')) {
            localStorage.removeItem('escala_estado');
            estadoAtual = JSON.parse(JSON.stringify(ESTADO_BASE_SETEMBRO));
            atualizarLabelsUI(estadoAtual);
            calendarioContainer.innerHTML = '<div class="alert alert-info">Ordem das folgas resetada. Gere uma nova escala.</div>';
            alert('Ordem das folgas resetada com sucesso!');
        }
    });

    function carregarEstado() {
        const estadoSalvo = localStorage.getItem('escala_estado');
        if (estadoSalvo) {
            return JSON.parse(estadoSalvo);
        }
        return JSON.parse(JSON.stringify(ESTADO_BASE_SETEMBRO));
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

        let dias = [];
        for (let i = 1; i <= diasNoMes; i++) {
            dias.push({ dia: i, diaSemana: new Date(ano, mesJS, i).getDay(), folgas: [], freelancers: [] });
        }
        
        const estadoFinal = calcularRotacaoPrincipal(dias, estadoInicialDoMes, nomesDosGrupos);

        if (freelancer1) calcularEscalaFreelancer(dias, freelancer1);
        if (freelancer2) calcularEscalaFreelancer(dias, freelancer2, true);

        const nomeMes = new Date(ano, mesJS, 1).toLocaleString('pt-BR', { month: 'long' });

        return { ano, mes, nomeMes, dias, primeiroDiaSemana, estadoFinal };
    }

    function calcularRotacaoPrincipal(diasDoMes, estadoInicial, nomesDosGrupos) {
        let ordemDaSemana = [...estadoInicial.ordemDosGrupos];
        ordemDaSemana.unshift(ordemDaSemana.pop());

        diasDoMes.forEach(diaInfo => {
            const idGrupoSexta = ordemDaSemana[0];
            const idGrupoSabado = ordemDaSemana[1];
            const idGrupoDomingo = ordemDaSemana[2];

            if (diaInfo.diaSemana === 5) { // Sexta
                diaInfo.folgas.push({ tipo: 'sexta', grupo: nomesDosGrupos[idGrupoSexta] });
            } else if (diaInfo.diaSemana === 6) { // Sábado
                diaInfo.folgas.push({ tipo: 'sabado', grupo: nomesDosGrupos[idGrupoSabado] });
            } else if (diaInfo.diaSemana === 0) { // Domingo
                diaInfo.folgas.push({ tipo: 'domingo', grupo: nomesDosGrupos[idGrupoDomingo] });
                ordemDaSemana.unshift(ordemDaSemana.pop());
            }
        });
        return { ordemDosGrupos: ordemDaSemana };
    }

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

    function renderizarCalendario(dados) {
        let html = `
            <div class="text-center"><h2>Escala de ${dados.nomeMes.charAt(0).toUpperCase() + dados.nomeMes.slice(1)} de ${dados.ano}</h2></div>
            <div class="calendario-grid mt-3">
                <div class="header-dia">Dom</div><div class="header-dia">Seg</div><div class="header-dia">Ter</div><div class="header-dia">Qua</div><div class="header-dia">Qui</div><div class="header-dia">Sex</div><div class="header-dia">Sáb</div>`;
        for (let i = 0; i < dados.primeiroDiaSemana; i++) { html += `<div class="dia-celula outro-mes"></div>`; }
        dados.dias.forEach(dia => {
            html += `<div class="dia-celula"><div class="dia-numero">${dia.dia}</div>`;
            if (dia.folgas.length > 0) {
                const folga = dia.folgas[0];
                html += `<ul class="lista-folgas"><strong>Folgas:</strong>`;
                folga.grupo.forEach(pessoa => { html += `<li class="folga-${folga.tipo}">${pessoa}</li>`; });
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
