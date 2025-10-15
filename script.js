// script.js - WordClub game logic
(() => {
    const WORD = 'CERCANO'; // 5-letter target (changeable)
    const MAX_ATTEMPTS = 4;
    const WORD_LENGTH = 7; // PALABRA LENGTH
        

    let attempt = 0;
    let gameEnded = false;

    const board = document.getElementById('game-board');
    const input = document.getElementById('guess-input');
    const btn = document.getElementById('guess-btn');
    const message = document.getElementById('message');
    const logoFile = document.getElementById('logo-file');
    const logo = document.getElementById('logo');
    const logoReset = document.getElementById('logo-reset');

    const originalLogoSrc = logo?.src || '';

    // build board
    let activeCol = 0; // selected column in current row
    function initBoard() {
        board.innerHTML = '';
        for (let r = 0; r < MAX_ATTEMPTS; r++) {
            const row = document.createElement('div');
            row.className = 'row';
            for (let c = 0; c < WORD_LENGTH; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.setAttribute('data-col', c);
                // make only current attempt row editable/selectable
                cell.tabIndex = r === attempt ? 0 : -1;

                // click/tap selects the cell (only if current attempt)
                cell.addEventListener('click', (e) => {
                    if (r !== attempt) return;
                    setActiveCell(c);
                    // show overlay input to trigger mobile keyboard
                    showCellInput(row, cell, c);
                });

                // keyboard handler for per-cell typing
                cell.addEventListener('keydown', (e) => {
                    if (r !== attempt) return;
                    const key = e.key;
                    if (/^[a-zA-ZÑñÁÉÍÓÚáéíóúüÜ]$/.test(key)) {
                        e.preventDefault();
                        cell.textContent = key.toUpperCase();
                        // move to next cell when typing
                        const next = Math.min(WORD_LENGTH - 1, parseInt(cell.dataset.col) + 1);
                        setActiveCell(next);
                        const nextCell = board.children[attempt].children[next];
                        nextCell.focus();
                    } else if (key === 'Backspace') {
                        e.preventDefault();
                        // clear this cell and move left if empty
                        if (cell.textContent) {
                            cell.textContent = '';
                        } else {
                            const prev = Math.max(0, parseInt(cell.dataset.col) - 1);
                            setActiveCell(prev);
                            const prevCell = board.children[attempt].children[prev];
                            prevCell.textContent = '';
                            prevCell.focus();
                        }
                    } else if (key === 'ArrowRight') {
                        e.preventDefault();
                        const next = Math.min(WORD_LENGTH - 1, parseInt(cell.dataset.col) + 1);
                        setActiveCell(next);
                        board.children[attempt].children[next].focus();
                    } else if (key === 'ArrowLeft') {
                        e.preventDefault();
                        const prev = Math.max(0, parseInt(cell.dataset.col) - 1);
                        setActiveCell(prev);
                        board.children[attempt].children[prev].focus();
                    } else if (key === 'Enter') {
                        e.preventDefault();
                        // try to submit using row contents
                        submitCurrentRowOrInput();
                    }
                });

                row.appendChild(cell);
            }
            board.appendChild(row);
        }
        // select first cell of current attempt
        setActiveCell(activeCol);
    }

    function showMessage(txt) {
        message.textContent = txt;
    }

    function checkGuess(guess) {
        guess = guess.toUpperCase();
        const res = Array(WORD_LENGTH).fill('absent');
        const wordArr = WORD.split('');

        // correct positions first
        for (let i = 0; i < WORD_LENGTH; i++) {
            if (guess[i] === wordArr[i]) {
                res[i] = 'correct';
                wordArr[i] = null;
            }
        }
        // present elsewhere
        for (let i = 0; i < WORD_LENGTH; i++) {
            if (res[i] === 'correct') continue;
            const idx = wordArr.indexOf(guess[i]);
            if (idx !== -1) {
                res[i] = 'present';
                wordArr[idx] = null;
            }
        }
        return res;
    }

    function applyResultToRow(rowIdx, guess, result) {
        const row = board.children[rowIdx];
        for (let i = 0; i < WORD_LENGTH; i++) {
            const cell = row.children[i];
            cell.textContent = guess[i];
            cell.classList.remove('absent','present','correct','win');
            cell.classList.add(result[i]);
            // once result is applied, disable editing on these cells
            cell.tabIndex = -1;
        }
        // hide overlay if any when a row is revealed
        hideCellInput();
    }

    function revealWin(rowIdx) {
        const row = board.children[rowIdx];
        for (let i = 0; i < WORD_LENGTH; i++) {
            const cell = row.children[i];
            cell.classList.remove('correct');
            cell.classList.add('win');
        }
    }

    function handleGuess() {
        if (gameEnded) return;
        // Determine guess: priority to full input box; otherwise read row cells
        let guess = input.value.trim().toUpperCase();
        if (!guess) {
            // build from cells
            const row = board.children[attempt];
            let built = '';
            for (let i = 0; i < WORD_LENGTH; i++) built += (row.children[i].textContent || '');
            guess = built.toUpperCase();
        }

        if (guess.length !== WORD_LENGTH) {
            showMessage(`La palabra debe tener ${WORD_LENGTH} letras.`);
            return;
        }
        if (!/^[A-ZÑÁÉÍÓÚÜ]+$/.test(guess)) {
            showMessage('Solo letras permitidas.');
            return;
        }

        const result = checkGuess(guess);
        applyResultToRow(attempt, guess, result);

        if (guess === WORD) {
            revealWin(attempt);
            showMessage('¡Acertaste!');
            gameEnded = true;
            input.disabled = true;
            btn.disabled = true;
            return;
        }

        attempt++;
        if (attempt >= MAX_ATTEMPTS) {
            // show full word in message and mark game over
            showMessage(`Has perdido. La palabra era: ${WORD}`);
            gameEnded = true;
            input.disabled = true;
            btn.disabled = true;
            return;
        }

        // prepare next row for editing
        input.value = '';
        activeCol = 0;
        enableRowEditing(attempt, true);
        showMessage(`Intento ${attempt + 1} de ${MAX_ATTEMPTS}`);
    }

    function submitCurrentRowOrInput() {
        // helper to trigger handleGuess from Enter pressed on cell
        handleGuess();
    }

    function setActiveCell(col) {
        activeCol = col;
        const row = board.children[attempt];
        if (!row) return;
        for (let i = 0; i < WORD_LENGTH; i++) {
            const c = row.children[i];
            if (i === col) c.classList.add('selected'); else c.classList.remove('selected');
        }
    }

    // Overlay input to get mobile keyboard and accept single letters
    let overlayInput = null;
    function createOverlayInput() {
        if (overlayInput) return overlayInput;
        overlayInput = document.createElement('input');
        overlayInput.id = 'cell-input';
        overlayInput.type = 'text';
        overlayInput.maxLength = 1;
        overlayInput.autocapitalize = 'characters';
        overlayInput.autocomplete = 'off';
        overlayInput.spellcheck = false;
        overlayInput.style.position = 'absolute';
        overlayInput.style.zIndex = 9999;
        overlayInput.style.background = 'transparent';
        overlayInput.style.border = 'none';
        overlayInput.style.outline = 'none';
        overlayInput.style.textAlign = 'center';
        overlayInput.style.fontWeight = '800';
        overlayInput.style.textTransform = 'uppercase';
        overlayInput.style.color = '#071726';
        overlayInput.style.fontFamily = 'Montserrat, Arial, sans-serif';
        document.body.appendChild(overlayInput);

        // input event: set letter and move next
        overlayInput.addEventListener('input', (e) => {
            const val = overlayInput.value.trim().toUpperCase();
            if (!val) return;
            const char = val[0];
            if (!/^[A-ZÑÁÉÍÓÚÜ]$/.test(char)) {
                overlayInput.value = '';
                return;
            }
            const row = board.children[attempt];
            if (!row) return;
            const cell = row.children[overlayInput._col];
            if (!cell) return;
            cell.textContent = char;
            overlayInput.value = '';
            // move to next cell
            const next = Math.min(WORD_LENGTH - 1, overlayInput._col + 1);
            setActiveCell(next);
            positionOverlayAtCell(row.children[next]);
        });

        overlayInput.addEventListener('keydown', (e) => {
            const key = e.key;
            if (key === 'Backspace') {
                e.preventDefault();
                const row = board.children[attempt];
                const col = overlayInput._col || 0;
                const cell = row.children[col];
                if (cell && cell.textContent) {
                    cell.textContent = '';
                } else if (col > 0) {
                    const prev = col - 1;
                    setActiveCell(prev);
                    positionOverlayAtCell(row.children[prev]);
                    row.children[prev].textContent = '';
                }
            } else if (key === 'Enter') {
                e.preventDefault();
                handleGuess();
            } else if (key === 'ArrowRight') {
                e.preventDefault();
                const row = board.children[attempt];
                const next = Math.min(WORD_LENGTH - 1, overlayInput._col + 1);
                setActiveCell(next);
                positionOverlayAtCell(row.children[next]);
            } else if (key === 'ArrowLeft') {
                e.preventDefault();
                const row = board.children[attempt];
                const prev = Math.max(0, overlayInput._col - 1);
                setActiveCell(prev);
                positionOverlayAtCell(row.children[prev]);
            }
        });

        overlayInput.addEventListener('blur', () => {
            // keep overlay hidden on blur
            hideCellInput();
        });

        return overlayInput;
    }

    function positionOverlayAtCell(cell) {
        if (!overlayInput || !cell) return;
        const rect = cell.getBoundingClientRect();
        overlayInput.style.width = rect.width + 'px';
        overlayInput.style.height = rect.height + 'px';
        overlayInput.style.left = (window.scrollX + rect.left) + 'px';
        overlayInput.style.top = (window.scrollY + rect.top) + 'px';
        overlayInput.style.fontSize = (rect.height * 0.6) + 'px';
        overlayInput._col = parseInt(cell.dataset.col);
    }

    function showCellInput(row, cell, col) {
        const inputEl = createOverlayInput();
        positionOverlayAtCell(cell);
        inputEl._col = col;
        inputEl.value = '';
        inputEl.style.display = 'block';
        inputEl.focus();
        // On some browsers focusing immediately may not open keyboard; small timeout helps
        setTimeout(() => inputEl.focus(), 50);
    }

    function hideCellInput() {
        if (!overlayInput) return;
        overlayInput.style.display = 'none';
        overlayInput._col = null;
    }

    function enableRowEditing(rowIdx, enable) {
        const row = board.children[rowIdx];
        if (!row) return;
        for (let i = 0; i < WORD_LENGTH; i++) {
            const c = row.children[i];
            c.tabIndex = enable ? 0 : -1;
        }
        if (enable) {
            setActiveCell(0);
            row.children[0].focus();
        }
    }

    // logo file handling
    if (logoFile) {
        logoFile.addEventListener('change', (e) => {
            const f = e.target.files && e.target.files[0];
            if (!f) return;
            const url = URL.createObjectURL(f);
            if (logo) logo.src = url;
        });
    }

    if (logoReset) {
        logoReset.addEventListener('click', () => {
            if (logo) logo.src = originalLogoSrc;
            if (logoFile) logoFile.value = '';
        });
    }

    btn.addEventListener('click', handleGuess);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleGuess(); });

    // init
    initBoard();
    showMessage(`Palabra de ${WORD_LENGTH} letras. ¡Tienes ${MAX_ATTEMPTS} intentos!`);

})();
