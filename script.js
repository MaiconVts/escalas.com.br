// Espera o conteúdo da página carregar completamente para rodar o script
document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURAÇÃO INICIAL E ESTADO ---
    // Estes são os grupos fixos baseados na última semana de Setembro de 2025.
    const GRUPOS_DE_FOLGA = {
        grupoA: ['Maicon', 'Iranilda', 'Valeria'],
        grupoB: ['Elida', 'Ingred', 'Daiane'],
        grupoC: ['Stefany', 'Ana Flavia', 'Luciana', 'Isadora']
    };
    
    // Mapeamento inicial: No final de Setembro, Grupo A folgou na sexta (dia 5 da semana), etc.
    // Dia da semana: 0=Domingo, 1=Segunda, ..., 5=Sexta, 6=Sábado
    const ESTADO_INICIAL = {
        5: GRUPOS_DE_FOLGA.grupoA, // Sexta
        6: GRUPOS_DE_FOLGA.grupoB, // Sábado
        0: GRUPOS_DE_FOLGA.grupoC  // Domingo
    };

    // --- ELEMENTOS DO DOM (Interface) ---
    const mesInput = document.getElementById('mes');
    const anoInput = document.getElementById('ano');
    const freelancer1Input = document.getElementById('freelancer1');
    const freelancer2Input = document.getElementById('freelancer2');
    const gerarEscalaBtn = document.getElementById('gerar-escala-btn');
    const calendarioContainer = document.getElementById('calendario-container');

    // --- EVENTO PRINCIPAL ---
    gerarEscalaBtn.addEventListener('click', () => {
        const mes = parseInt(mesInput.value);
        const ano = parseInt(anoInput.value);
        const freelancer1 = freelancer1Input.value.trim();
        const freelancer2 = freelancer2Input.value.trim();

        // 1. Gera os dados da escala
        const dadosEscala = gerarDadosDaEscala(ano, mes, freelancer1, freelancer2);
        
        // 2. Renderiza o calendário na tela
        renderizarCalendario(dadosEscala);
    });

    // --- FUNÇÕES DE LÓGICA ---

    /**
     * Orquestra a geração de todos os dados necessários para a escala do mês.
     */
    function gerarDadosDaEscala(ano, mes, freelancer1, freelancer2) {
        // O mês no objeto Date do JS é 0-indexado (Janeiro=0, Dezembro=11)
        const mesJS = mes - 1;
        const diasNoMes = new Date(ano, mes, 0).getDate();
        const primeiroDiaSemana = new Date(ano, mesJS, 1).getDay(); // 0=Domingo, 1=Seg, ...

        const dias = [];
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
        
        // Calcula as folgas do grupo principal
        calcularRotacaoPrincipal(dias);

        // Calcula a escala dos freelancers, se os nomes foram fornecidos
        if (freelancer1) {
            calcularEscalaFreelancer(dias, freelancer1, 'freelancer1');
        }
        if (freelancer2) {
            // Para o segundo, precisamos saber seu último status. Por simplicidade,
            // vamos assumir que ele está no ciclo oposto ao primeiro.
            // Para uma lógica mais robusta, precisaríamos do estado real dele.
            calcularEscalaFreelancer(dias, freelancer2, 'freelancer2', true);
        }

        const nomeMes = new Date(ano, mesJS, 1).toLocaleString('pt-BR', { month: 'long' });

        return { ano, mes, nomeMes, dias, primeiroDiaSemana };
    }

    /**
     * Calcula as folgas do grupo principal com base na rotação.
     */
    function calcularRotacaoPrincipal(diasDoMes) {
        let folgaSexta = ESTADO_INICIAL[5];
        let folgaSabado = ESTADO_INICIAL[6];
        let folgaDomingo = ESTADO_INICIAL[0];

        diasDoMes.forEach(diaInfo => {
            // A rotação acontece no início da semana (Domingo)
            if (diaInfo.diaSemana === 0 && diaInfo.dia > 1) { 
                const tempFolgaSexta = folgaSexta;
                folgaSexta = folgaDomingo; // Quem folgou no Domingo, folgará na Sexta
                folgaDomingo = folgaSabado; // Quem folgou no Sábado, folgará no Domingo
                folgaSabado = tempFolgaSexta; // Quem folgou na Sexta, folgará no Sábado
            }

            if (diaInfo.diaSemana === 5) { // Sexta-feira
                diaInfo.folgas.push({ tipo: 'sexta', grupo: folgaSexta });
            } else if (diaInfo.diaSemana === 6) { // Sábado
                diaInfo.folgas.push({ tipo: 'sabado', grupo: folgaSabado });
            } else if (diaInfo.diaSemana === 0) { // Domingo
                diaInfo.folgas.push({ tipo: 'domingo', grupo: folgaDomingo });
            }
        });
    }

    /**
     * Calcula a escala de um freelancer (dia sim, dia não).
     */
    function calcularEscalaFreelancer(diasDoMes, nome, id, comecarTrabalhando = false) {
        // Precisamos saber o status do último dia do mês anterior para continuar a sequência.
        // Isso é complexo, então vamos simplificar e assumir um estado inicial para o dia 1.
        let trabalhaHoje = comecarTrabalhando; 
        
        diasDoMes.forEach(diaInfo => {
            let status = '';
            if (diaInfo.diaSemana === 0) { // Domingo é sempre folga
                status = 'Folga';
            } else {
                status = trabalhaHoje ? 'Trabalha' : 'Folga';
            }
            
            diaInfo.freelancers.push({ nome, status, id });
            
            // Inverte o status para o próximo dia, independentemente de ser domingo ou não
            trabalhaHoje = !trabalhaHoje;
        });
    }


    // --- FUNÇÕES DE RENDERIZAÇÃO (VISUAL) ---

    /**
     * Pega os dados da escala e cria o HTML do calendário.
     */
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
                <div class="header-dia">Sáb</div>
        `;

        // Adiciona células vazias para os dias antes do início do mês
        for (let i = 0; i < dados.primeiroDiaSemana; i++) {
            html += `<div class="dia-celula outro-mes"></div>`;
        }

        // Adiciona as células para cada dia do mês
        dados.dias.forEach(dia => {
            html += `<div class="dia-celula">`;
            html += `<div class="dia-numero">${dia.dia}</div>`;

            // Adiciona a lista de folgas do grupo principal
            if (dia.folgas.length > 0) {
                const folga = dia.folgas[0];
                html += `<ul class="lista-folgas"><strong>Folgas:</strong>`;
                folga.grupo.forEach(pessoa => {
                    html += `<li class="folga-${folga.tipo}">${pessoa}</li>`;
                });
                html += `</ul>`;
            }

            // Adiciona o status dos freelancers
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
