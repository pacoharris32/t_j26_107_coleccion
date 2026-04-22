document.addEventListener('DOMContentLoaded', () => {
    const loader = document.getElementById('loader-container');
    const filtroId = document.getElementById('filtro-id');
    const filtroEstado = document.getElementById('filtro-estado');
    const filtroAnio = document.getElementById('filtro-anio');
    const filtroTexto = document.getElementById('filtro-texto');
    const tablaResultados = document.getElementById('tabla-resultados');
    const paginationContainer = document.querySelector('.pagination');
    const contadorResultados = document.getElementById('contador-resultados');
    const containerId = document.getElementById('container-id-search');
    const btnLimpiar = document.getElementById('btn-limpiar-filtros');

    let estudiosData = [];
    let estudiosFiltrados = [];
    let currentPage = 1;
    const studiesPerPage = 20;

    // --- LÓGICA DE LA ANIMACIÓN DEL ID ---
    if (containerId && filtroId) {
        containerId.addEventListener('click', () => {
            containerId.classList.add('active');
            filtroId.focus();
        });
        filtroId.addEventListener('blur', () => {
            if (filtroId.value.trim() === "") {
                containerId.classList.remove('active');
            }
        });
        filtroId.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // --- CARGA DE DATOS CSV ---
    const cargarDatos = async () => {
        try {
            const res = await fetch('data/T_BIBLIOTECA_15FEB24_TESIS.csv');
            const text = await res.text();
            estudiosData = parseCSVRobust(text);

            poblarFiltroEstado(); 
            // El filtro de año inicia vacío por defecto
            aplicarFiltrosYRenderizar();
        } catch (error) {
            console.error("Error cargando el archivo de Tesis:", error);
        } finally {
            if (loader) loader.style.display = 'none';
        }
    };

    const parseCSVRobust = (text) => {
        const rows = [];
        let row = [], field = '', inQuotes = false;
        for (let i = 0; i < text.length; i++) {
            const char = text[i], next = text[i+1];
            if (char === '"' && inQuotes && next === '"') { field += '"'; i++; }
            else if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) { row.push(field); field = ''; }
            else if ((char === '\r' || char === '\n') && !inQuotes) {
                if (field !== '' || row.length > 0) { row.push(field); rows.push(row); field = ''; row = []; }
                if (char === '\r' && next === '\n') i++;
            } else field += char;
        }
        if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
        const headers = rows[0].map(h => h.trim());
        return rows.slice(1).map(r => {
            const obj = {};
            headers.forEach((h, i) => { obj[h] = (r[i] || "").trim(); });
            return obj;
        });
    };

    const poblarFiltroEstado = () => {
        const estados = [...new Set(estudiosData.map(e => e.ESTADOS))].filter(Boolean).sort();
        filtroEstado.innerHTML = '<option value="">-- Todos los Estados --</option>';
        estados.forEach(edo => {
            const opt = document.createElement('option');
            opt.value = edo; opt.textContent = edo;
            filtroEstado.appendChild(opt);
        });
    };

    // --- POBLAR FILTRO AÑO (Ahora depende estrictamente de la selección) ---
    const poblarFiltroAnio = () => {
        const estadoSeleccionado = filtroEstado.value;
        
        // Si no hay estado seleccionado, vaciamos el filtro de años
        if (!estadoSeleccionado) {
            filtroAnio.innerHTML = '<option value="">-- Seleccione un Estado primero --</option>';
            filtroAnio.value = "";
            return;
        }

        // Filtrar data fuente para obtener años solo del estado seleccionado
        const dataParaAnios = estudiosData.filter(e => e.ESTADOS === estadoSeleccionado);
        const anios = [...new Set(dataParaAnios.map(e => e.AÑO))].filter(Boolean).sort((a,b) => b-a);
        
        filtroAnio.innerHTML = '<option value="">-- Todos los Años --</option>';
        anios.forEach(anio => {
            const opt = document.createElement('option');
            opt.value = anio; opt.textContent = anio;
            filtroAnio.appendChild(opt);
        });
    };

    // --- LÓGICA DE FILTRADO ---
    const aplicarFiltrosYRenderizar = () => {
        const idV = filtroId.value.trim().toLowerCase();
        const edoV = filtroEstado.value;
        const anioV = filtroAnio.value;
        const txtV = filtroTexto.value.toLowerCase().trim();

        estudiosFiltrados = estudiosData.filter(e => {
            const matchId = !idV || (e.ID_ESTUDIOS && e.ID_ESTUDIOS.toLowerCase().includes(idV));
            const matchEdo = !edoV || e.ESTADOS === edoV;
            const matchAnio = !anioV || e.AÑO === anioV;
            const matchTxt = !txtV || ((e.TITULO_ORIGINAL || "").toLowerCase().includes(txtV));
            return matchId && matchEdo && matchAnio && matchTxt;
        });

        currentPage = 1;
        renderizarTabla();
    };

    const renderizarTabla = () => {
        tablaResultados.innerHTML = '';
        const inicio = (currentPage - 1) * studiesPerPage;
        const pagedItems = estudiosFiltrados.slice(inicio, inicio + studiesPerPage);

        pagedItems.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight: bold;">${item.ID_ESTUDIOS}</td>
                <td style="text-align:left;">${item.TITULO_ORIGINAL}</td>
                <td style="text-align:center;">${item.AÑO}</td>
                <td>${item.ESTADOS}</td>
                <td style="font-size: 0.85em;">${item.FUENTE}</td>
            `;
            tablaResultados.appendChild(tr);
        });
        contadorResultados.textContent = `${estudiosFiltrados.length} tesis encontradas`;
        renderizarPaginacion();
    };

    const renderizarPaginacion = () => {
        paginationContainer.innerHTML = '';
        const totalPages = Math.ceil(estudiosFiltrados.length / studiesPerPage);
        if (totalPages <= 1) return;

        const createBtn = (page, text, active = false) => {
            const btn = document.createElement('button');
            btn.textContent = text;
            if (active) btn.classList.add('active');
            btn.onclick = () => { currentPage = page; renderizarTabla(); window.scrollTo({top: 400, behavior:'smooth'}); };
            return btn;
        };

        if (currentPage > 1) paginationContainer.appendChild(createBtn(currentPage - 1, 'Anterior'));
        let start = Math.max(1, currentPage - 2);
        let end = Math.min(totalPages, start + 4);
        if (end - start < 4) start = Math.max(1, end - 4);
        for (let i = start; i <= end; i++) {
            paginationContainer.appendChild(createBtn(i, i, i === currentPage));
        }
        if (currentPage < totalPages) paginationContainer.appendChild(createBtn(currentPage + 1, 'Siguiente'));
    };

    // --- ASIGNACIÓN DE EVENTOS ---
    filtroEstado.addEventListener('change', () => {
        poblarFiltroAnio();
        aplicarFiltrosYRenderizar();
    });

    filtroAnio.addEventListener('change', aplicarFiltrosYRenderizar);
    filtroId.addEventListener('input', aplicarFiltrosYRenderizar);
    filtroTexto.addEventListener('input', aplicarFiltrosYRenderizar);

    btnLimpiar.addEventListener('click', () => {
        filtroId.value = ''; filtroEstado.value = ''; filtroAnio.value = ''; filtroTexto.value = '';
        if (containerId) containerId.classList.remove('active');
        poblarFiltroAnio(); 
        aplicarFiltrosYRenderizar();
    });

    document.getElementById('btn-exportar').addEventListener('click', () => {
        let csv = "ID,TITULO,AÑO,ESTADO,FUENTE\n";
        estudiosFiltrados.forEach(e => {
            const tituloLimpio = e.TITULO_ORIGINAL ? e.TITULO_ORIGINAL.replace(/\"/g,'""') : "";
            csv += `"${e.ID_ESTUDIOS}","${tituloLimpio}","${e.AÑO}","${e.ESTADOS}","${e.FUENTE}"\n`;
        });
        const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "Tesis_Export.csv";
        link.click();
    });

    cargarDatos();
});