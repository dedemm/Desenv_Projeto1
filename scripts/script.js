import { format, parse, isValid } from 'date-fns';

document.addEventListener('DOMContentLoaded', () => {
    const addRoomButton = document.getElementById('add-room-button');
    const newRoomNameInput = document.getElementById('new-room-name');
    const roomsListDiv = document.getElementById('rooms-list');
    const noRoomsMessage = document.getElementById('no-rooms-message');
    const STORAGE_KEY = 'homeWifiTrackerData';

    let rooms = loadRooms();

    addRoomButton.addEventListener('click', addRoom);
    newRoomNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addRoom();
        }
    });

    roomsListDiv.addEventListener('click', (event) => {
        const target = event.target;
        const roomEntry = target.closest('.room-entry');
        if (!roomEntry) return;

        const roomId = roomEntry.dataset.roomId;

        if (target.classList.contains('save-new-measurement-button')) {
            saveNewMeasurement(roomId, roomEntry);
        } else if (target.classList.contains('delete-measurement-button')) {
            const measurementItem = target.closest('.measurement-item');
            if (measurementItem) {
                const measurementId = measurementItem.dataset.measurementId;
                deleteMeasurement(roomId, measurementId);
            }
        } else if (target.classList.contains('delete-room-button')) {
             deleteRoom(roomId);
        }
    });

    function addRoom() {
        const roomName = newRoomNameInput.value.trim();
        if (roomName === '') {
            alert('Informe o nome do quarto!');
            return;
        }
        if (rooms.some(room => room.name.toLowerCase() === roomName.toLowerCase())) {
            alert(`Quarto com nome "${roomName}" ja existe.`);
            return;
        }

        const newRoom = {
            id: Date.now().toString(),
            name: roomName,
            measurementSets: []
        };

        rooms.push(newRoom);
        saveRooms();
        renderRoom(newRoom);
        newRoomNameInput.value = '';
        newRoomNameInput.focus();
        toggleNoRoomsMessage();
    }

    function saveNewMeasurement(roomId, roomEntryElement) {
        const roomIndex = rooms.findIndex(room => room.id === roomId);
        if (roomIndex === -1) return;

        const room = rooms[roomIndex];
        const newMeasurementSection = roomEntryElement.querySelector('.new-measurement-section');

        const dateInput = newMeasurementSection.querySelector('input[name="measurement-date"]');
        const timeInput = newMeasurementSection.querySelector('input[name="measurement-time"]');
        const speed24Input = newMeasurementSection.querySelector('input[name="speed24"]');
        const speed5Input = newMeasurementSection.querySelector('input[name="speed5"]');
        const interferenceInput = newMeasurementSection.querySelector('input[name="interference"]');
        const signal24Input = newMeasurementSection.querySelector('input[name="signal24"]');
        const signal5Input = newMeasurementSection.querySelector('input[name="signal5"]');

        const dateValue = dateInput.value;
        const timeValue = timeInput.value;

        // --- Validation for Date and Time ---
        if (!dateValue || !timeValue) {
            alert('Informe uma data e horario para registrar a medição.');
            return;
        }

        const dateTimeString = `${dateValue}T${timeValue}`;
        const measurementDate = parse(dateTimeString, "yyyy-MM-dd'T'HH:mm", new Date());

        if (!isValid(measurementDate)) {
            alert('Data e/ou horario inválidos.');
            return;
        }

        const newMeasurement = {
            id: Date.now().toString(),
            timestamp: measurementDate.toISOString(),
            values: {
                speed24: speed24Input.value.trim(),
                speed5: speed5Input.value.trim(),
                interference: interferenceInput.value.trim(),
                signal24: signal24Input.value.trim(),
                signal5: signal5Input.value.trim()
            }
        };

        const allMeasurementValues = Object.values(newMeasurement.values);
        if (allMeasurementValues.every(val => val === '')) {
             alert('Inserir ao menos 1 medida (Velocidade, Interferencia ou Sinal).');
             return;
        }


        room.measurementSets.push(newMeasurement);
        room.measurementSets.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); 

        saveRooms();

        renderRecordedMeasurements(room, roomEntryElement);

        const now = new Date();
        dateInput.value = format(now, 'yyyy-MM-dd'); 
        timeInput.value = format(now, 'HH:mm');
        speed24Input.value = '';
        speed5Input.value = '';
        interferenceInput.value = '';
        signal24Input.value = '';
        signal5Input.value = '';

        alert('Medição salva com sucesso!');
    }

    function deleteMeasurement(roomId, measurementId) {
        const roomIndex = rooms.findIndex(room => room.id === roomId);
        if (roomIndex === -1) return;

        const room = rooms[roomIndex];
        const measurementIndex = room.measurementSets.findIndex(m => m.id === measurementId);
        if (measurementIndex === -1) return;
         // if (!confirm('Deseja mesmo excluir a medição?')) {
         //     return;
         // }

        room.measurementSets.splice(measurementIndex, 1);
        saveRooms();

        const roomEntryElement = roomsListDiv.querySelector(`.room-entry[data-room-id="${roomId}"]`);
        if (roomEntryElement) {
             renderRecordedMeasurements(room, roomEntryElement);
        } else {
            renderRoomsList();
        }
    }

    function deleteRoom(roomId) {
        const roomIndex = rooms.findIndex(room => room.id === roomId);
        if (roomIndex === -1) return;

        const roomName = rooms[roomIndex].name;
        if (confirm(`Deseja mesmo deletar o quarto "${roomName}" junto com suas medições?`)) {
            rooms.splice(roomIndex, 1); 
            saveRooms();
            const roomElement = roomsListDiv.querySelector(`.room-entry[data-room-id="${roomId}"]`);
            if (roomElement) {
                roomElement.remove();
            }
            toggleNoRoomsMessage();
        }
    }

    function renderRoom(room) {
        const roomDiv = document.createElement('div');
        roomDiv.classList.add('room-entry');
        roomDiv.dataset.roomId = room.id;

        const now = new Date();
        const defaultDate = format(now, 'yyyy-MM-dd');
        const defaultTime = format(now, 'HH:mm');

        roomDiv.innerHTML = `
            <div class="room-header">
                <h3>${escapeHTML(room.name)}</h3>
                <button class="delete-button delete-room-button" title="Deletar Quarto">Deletar</button>
            </div>

            <div class="new-measurement-section">
                <h4>Adicionar nova medição</h4>
                <div class="measurement-inputs">
                    <div class="measurement-group">
                        <label for="date-new-${room.id}">Data:</label>
                        <input type="date" id="date-new-${room.id}" name="measurement-date" value="${defaultDate}">
                    </div>
                    <div class="measurement-group">
                        <label for="time-new-${room.id}">Horario:</label>
                        <input type="time" id="time-new-${room.id}" name="measurement-time" value="${defaultTime}">
                    </div>
                    <div class="measurement-group">
                        <label for="speed24-new-${room.id}">Velocidade (2.4GHz, Mbps):</label>
                        <input type="number" id="speed24-new-${room.id}" name="speed24" placeholder="ex: 50">
                    </div>
                    <div class="measurement-group">
                        <label for="speed5-new-${room.id}">Velocidade (5GHz, Mbps):</label>
                        <input type="number" id="speed5-new-${room.id}" name="speed5" placeholder="ex: 300">
                    </div>
                     <div class="measurement-group">
                        <label for="signal24-new-${room.id}">Nivel do Sinal (2.4GHz, dBm):</label>
                        <input type="number" id="signal24-new-${room.id}" name="signal24" placeholder="ex: -65">
                    </div>
                     <div class="measurement-group">
                        <label for="signal5-new-${room.id}">Nivel do Sinal (5GHz, dBm):</label>
                        <input type="number" id="signal5-new-${room.id}" name="signal5" placeholder="ex: -55">
                    </div>
                    <div class="measurement-group">
                        <label for="interference-new-${room.id}">Interferencia:</label>
                        <input type="text" id="interference-new-${room.id}" name="interference" placeholder="ex: Baixa, Media, Alta">
                    </div>
                </div>
                <button class="action-button save-new-measurement-button">Salvar medição</button>
            </div>

            <div class="recorded-measurements-section">
                <h4>Medições salvas</h4>
                <ul class="recorded-measurements-list">
                </ul>
                 <p class="no-measurements-message" style="display: none;">Nenhuma medição foi encontrada!</p>
            </div>
        `;

        const insertBeforeElement = roomsListDiv.querySelector('#no-rooms-message') || null;
        roomsListDiv.insertBefore(roomDiv, insertBeforeElement);

        renderRecordedMeasurements(room, roomDiv);
    }

    function renderRecordedMeasurements(room, roomEntryElement) {
        const listElement = roomEntryElement.querySelector('.recorded-measurements-list');
        const noMeasurementsMsg = roomEntryElement.querySelector('.no-measurements-message');
        listElement.innerHTML = ''; 

        if (room.measurementSets.length === 0) {
            noMeasurementsMsg.style.display = 'block'; 
        } else {
            noMeasurementsMsg.style.display = 'none';
            room.measurementSets.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            room.measurementSets.forEach(measurement => {
                const item = document.createElement('li');
                item.classList.add('measurement-item');
                item.dataset.measurementId = measurement.id;

                let formattedTimestamp = 'Data invalida!';
                const measurementDate = new Date(measurement.timestamp).toLocaleString('pt-BR');
                // if (isValid(measurementDate)) {
                //    formattedTimestamp = format(measurementDate, 'PPpp', { locale: ptBR });
                // } else {
                //     console.warn("Timestamp invalida:", measurement.timestamp);
                // }

                const getValue = (val) => escapeHTML(val || '-');

                item.innerHTML = `
                    <div class="measurement-item-details">
                        <span class="measurement-timestamp">${escapeHTML(measurementDate)}</span>
                        <div class="measurement-values">
                            <span><strong>Velocidade 2.4GHz:</strong> ${getValue(measurement.values.speed24)} Mbps</span>
                            <span><strong>Velocidade 5GHz:</strong> ${getValue(measurement.values.speed5)} Mbps</span>
                            <span><strong>Sinal 2.4GHz:</strong> ${getValue(measurement.values.signal24)} dBm</span>
                            <span><strong>Sinal 5GHz:</strong> ${getValue(measurement.values.signal5)} dBm</span>
                            <span><strong>Interferência:</strong> ${getValue(measurement.values.interference)}</span>
                        </div>
                    </div>
                    <button class="delete-button delete-measurement-button" title="Deletar medicao">Deletar</button>
                `;
                listElement.appendChild(item);
            });
        }
    }

    function renderRoomsList() {
        const existingEntries = roomsListDiv.querySelectorAll('.room-entry');
        existingEntries.forEach(entry => entry.remove());

        if (rooms.length > 0) {
            rooms.forEach(renderRoom); 
        }
        toggleNoRoomsMessage(); 
    }

    function toggleNoRoomsMessage() {
        if (rooms.length === 0) {
            noRoomsMessage.style.display = 'block';
        } else {
            noRoomsMessage.style.display = 'none';
        }
    }

    function saveRooms() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
    }

    function loadRooms() {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                if (Array.isArray(parsedData)) {
                     parsedData.forEach(room => {
                        if (room.measurementSets && Array.isArray(room.measurementSets)) {
                            room.measurementSets.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                            room.measurementSets.forEach(m => {
                                if (m.values && m.values.signal !== undefined && m.values.signal24 === undefined) {
                                    if (m.values.signal24 === undefined) m.values.signal24 = null;
                                    if (m.values.signal5 === undefined) m.values.signal5 = null;
                                } else if (!m.values) {
                                    m.values = {};
                                }
                            });
                        } else {
                            room.measurementSets = []; 
                        }
                    });
                    return parsedData;
                }
            } catch (e) {
                console.error(e);
            }
        }
        return []; 
    }

    function escapeHTML(str) {
        if (str === null || str === undefined) return '';
        const div = document.createElement('div');
        div.appendChild(document.createTextNode(String(str)));
        return div.innerHTML;
     }

    renderRoomsList();
});