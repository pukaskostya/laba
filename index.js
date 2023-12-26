// Импортируем нужные модули
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const {v4: uuidv4} = require('uuid');

// Изменяем название загружаемого файла на оригинальное
const storage = multer.diskStorage({
    destination: (request, file, cb) => {
        cb(null, 'upload/music');
    },
    filename: (request, file, cb) => {
        cb(null, file.originalname);
    }
});

// Создаем приложение, определяем порт и директорию для загрузки файлов
const app = express();
const port = 5001;
const musicUpload = multer({
    'storage': storage,
});

// Предоставление статических файлов, настройка парсера для корректной работы
app.use(express.static(__dirname));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// Обработчик ошибок
function error(response, err, statusCode, errMessage) {
    console.error(err);
    return response.status(statusCode).send(errMessage);
}

// Получение всех композиций с полями: название песни, исполнитель, путь сервера
app.get('/music', (request, response) => {
    fs.readFile('data.json', (err, data) => {
        if (err) {
            error(response, err, 500, 'Ошибка получения данных');
        } else {
            const music = JSON.parse(data);
            return response.json(music);
        }
    });
});

// Создание новой композиции с полями: название песни, исполнитель, путь сервера (localhost:3000/uploads/music/1.mp3)
app.post('/music_upload', musicUpload.single('musicFile'), (request, response) => {
    const id = uuidv4();
    const musicName = request.body.musicName;
    const musicAuthor = request.body.musicAuthor;
    const musicPath = request.file.path;

    fs.readFile('data.json', 'utf8', (err, data) => {
        if (err) {
            error(response, err, 500, 'Ошибка получения данных');
        } else {
            const music = JSON.parse(data);

            // Проверка на повторную запись в JSON файл
            const existingSong = music.find(song => `${song.musicAuthor.toLowerCase()} ${song.musicName.toLowerCase()}` === `${musicAuthor.toLowerCase()} ${musicName.toLowerCase()}`);
            if(existingSong) {
                error(response, 'Error: Dublicate music', 404, 'Такая песня уже добавлена');
            // Запись песни в JSON файл
            } else {
                music.push({id, musicName, musicAuthor, musicPath});
            
                fs.writeFile('data.json', JSON.stringify(music), 'utf8', (err) => {
                    if (err) {
                        error(response, err, 500, 'Ошибка записи данных');
                    } else {
                        return response.status(200).send('Данные успешно записаны');
                    }
                });
            }
        }
    });
});

// Удаление конкретного трэка по UUID
app.delete('/music/:uuid', (request, response) => {
    fs.readFile('data.json', 'utf8', (err, data) => {
        if (err) {
            error(response, err, 500, 'Ошибка получения данных');
        } else {
            const music = JSON.parse(data);
            const songIndex = music.findIndex(song => song.id === request.params.uuid);

            // Проверка на существование песни по UUID в JSON файле
            if (songIndex === -1) {
                error(response, 'Error: Song not found', 404, `Песня с ID: ${request.params.uuid} - не найдена`);
            // Удаление записи о песне по UUID из JSON файла
            } else {
                music.splice(songIndex, 1);
                fs.writeFile('data.json', JSON.stringify(music), 'utf8', (err) => {
                    error(response, err, 500, 'Ошибка записи данных');
                });
                return response.status(200).send(`Песня с ID: ${request.params.uuid} - удалена`);
            }
        }
    });
});

// Изменение определённого трэка по UUID
app.put('/music/:uuid', (request, response) => {
    fs.readFile('data.json', 'utf8', (err, data) => {
        if (err) {
            error(response, err, 500, 'Ошибка получения данных');
        } else {
            const music = JSON.parse(data);
            const songIndex = music.findIndex(song => song.id === request.params.uuid);

            // Проверка на существование песни по UUID в JSON файле
            if(songIndex === -1) {
                error(response, 'Error: Song not found', 404, `Песня с ID: ${request.params.uuid} - не найдена`);
            // Изменение записи о песне по UUID в JSON файле
            } else {
                music[songIndex].musicName = request.body.musicName;
                music[songIndex].musicAuthor = request.body.musicAuthor;

                fs.writeFile('data.json', JSON.stringify(music), 'utf8', (err) => {
                    error(response, err, 500, 'Ошибка записи данных');
                });
                return response.status(200).send(`Песня с ID: ${request.params.uuid} - изменена`);
            }
        }
    });
});

app.listen(port, () => {
    console.log(`TisApp is runnign on port: ${port}`);
});