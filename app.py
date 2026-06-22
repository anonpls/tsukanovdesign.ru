import json
import os
from pathlib import Path
from urllib import error, request

from flask import Flask, jsonify, redirect, render_template, request as flask_request, url_for

BASE_DIR = Path(__file__).resolve().parent
OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

app = Flask(__name__)


def load_env(path: Path = BASE_DIR / '.env') -> None:
    if not path.is_file():
        return

    for raw_line in path.read_text(encoding='utf-8').splitlines():
        line = raw_line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue

        key, value = line.split('=', 1)
        key = key.strip()
        value = value.strip().strip('"\'')
        if key and key not in os.environ:
            os.environ[key] = value


def trim(value: object, limit: int) -> str:
    return str(value or '')[:limit]


def build_prompt(payload: dict) -> str:
    context = trim(payload.get('context'), 40)
    niche = trim(payload.get('niche'), 120)
    pain = trim(payload.get('pain'), 120)
    message = trim(payload.get('message'), 1200)

    return f'''Ты маркетолог-диагност TSUKANOV. Ответь на русском для блока бесплатной AI-диагностики продаж.
Контекст страницы: {context}
Ниша: {niche}
Боль: {pain}
Комментарий клиента: {message}

Верни только валидный JSON без markdown:
{{
  "d": "короткий диагноз на 1-2 предложения, конкретный и без воды",
  "fix": ["3 конкретных действия"],
  "eff": ["короткая метрика", "подпись к метрике"]
}}'''


def normalize_result(result: dict) -> dict:
    diagnosis = trim(result.get('d'), 600)
    fixes = [trim(item, 180) for item in list(result.get('fix') or [])[:4]]
    effect = [trim(item, 80) for item in list(result.get('eff') or [])[:2]]

    if not diagnosis or not fixes or len(effect) < 2:
        raise ValueError('OpenRouter returned incomplete diagnosis')

    return {'d': diagnosis, 'fix': fixes, 'eff': effect}


@app.post('/api/ai-diagnosis')
def ai_diagnosis():
    load_env()

    api_key = os.getenv('OPENROUTER_API_KEY', '')
    model = os.getenv('OPENROUTER_MODEL', '')
    if not api_key or not model:
        return jsonify({'error': 'OPENROUTER_API_KEY and OPENROUTER_MODEL must be set in .env'}), 500

    payload = flask_request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({'error': 'Invalid JSON'}), 400

    openrouter_payload = {
        'model': model,
        'messages': [
            {
                'role': 'system',
                'content': 'Ты отвечаешь строго JSON-объектом. Не обещай гарантированный результат. Не используй markdown.',
            },
            {'role': 'user', 'content': build_prompt(payload)},
        ],
        'temperature': 0.7,
        'max_tokens': 700,
        'response_format': {'type': 'json_object'},
    }

    req = request.Request(
        OPENROUTER_URL,
        data=json.dumps(openrouter_payload, ensure_ascii=False).encode('utf-8'),
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_key}',
            'HTTP-Referer': flask_request.headers.get('Origin', 'https://tsukanovdesign.ru'),
            'X-Title': 'TSUKANOV AI Diagnosis',
        },
        method='POST',
    )

    try:
        with request.urlopen(req, timeout=20) as response:
            data = json.loads(response.read().decode('utf-8'))
    except error.HTTPError as exc:
        details = exc.read().decode('utf-8', errors='ignore')[:500]
        return jsonify({'error': 'OpenRouter request failed', 'status': exc.code, 'details': details}), 502
    except (error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        return jsonify({'error': 'OpenRouter request failed', 'details': str(exc)}), 502

    content = data.get('choices', [{}])[0].get('message', {}).get('content', '')
    try:
        return jsonify(normalize_result(json.loads(content)))
    except (json.JSONDecodeError, ValueError) as exc:
        return jsonify({'error': str(exc)}), 502


@app.get('/')
def index():
    return render_template('index.html')


@app.get('/sites')
@app.get('/sites.html')
def sites():
    return render_template('sites.html')


@app.get('/avito')
@app.get('/avito.html')
def avito():
    return render_template('avito.html')


@app.get('/geo')
@app.get('/geo.html')
def geo():
    return render_template('geo.html')


@app.get('/favicon.png')
def favicon():
    return redirect(url_for('static', filename='favicon.png'))


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', '5000')))
