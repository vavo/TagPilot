import { readFile } from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

function makeElement(id) {
    return {
        id,
        value: '',
        style: {},
        classList: {
            add() {},
            remove() {},
            toggle() {},
        },
        addEventListener() {},
        appendChild() {},
        querySelector(selector) {
            return makeElement(`${id}-${selector}`);
        },
        innerHTML: '',
        textContent: '',
    };
}

async function loadTagPilot({ selectedModel = 'openai', initialStore = {}, fetchHandler } = {}) {
    const html = await readFile(new URL('../tagpilot.html', import.meta.url), 'utf8');
    const script = html.match(/<script>([\s\S]*)<\/script>/)?.[1];
    assert.ok(script, 'inline script should exist');

    const elements = new Map();
    const cropperInstances = [];
    const croppedCanvasRequests = [];
    const getElement = (id) => {
        if (!elements.has(id)) elements.set(id, makeElement(id));
        return elements.get(id);
    };

    const fetchCalls = [];
    const localStore = new Map(Object.entries({
        selectedModel,
        geminiApiKey: initialStore.geminiApiKey || 'test-key',
        grokApiKey: initialStore.grokApiKey || 'test-key',
        openaiApiKey: initialStore.openaiApiKey || 'test-key',
        claudeApiKey: initialStore.claudeApiKey || 'test-key',
        vllmApiKey: initialStore.vllmApiKey || 'test-key',
        vllmEndpoint: initialStore.vllmEndpoint || 'https://pod-8000.proxy.runpod.net/v1/chat/completions',
        vllmModelType: initialStore.vllmModelType || 'Qwen/Qwen3-8B',
        ...initialStore,
    }));

    const context = {
        console,
        setTimeout: (callback) => {
            callback();
            return 0;
        },
        clearTimeout() {},
        FileReader: class {
            readAsDataURL() {
                this.result = 'data:image/png;base64,AAAA';
                this.onload();
            }
        },
        Cropper: class {
            constructor(image, options) {
                this.image = image;
                this.options = options;
                cropperInstances.push(this);
            }
            getData() {
                return { width: 400, height: 300 };
            }
            getCroppedCanvas(options = {}) {
                croppedCanvasRequests.push(options);
                return {
                    toBlob(callback) {
                        callback({ type: 'image/png' });
                    },
                };
            }
            destroy() {}
        },
        File: class {
            constructor(parts, name, options = {}) {
                this.parts = parts;
                this.name = name;
                this.type = options.type || '';
            }
        },
        FormData: class {
            constructor() {
                this.entries = [];
            }
            append(name, value, filename) {
                this.entries.push({ name, value, filename });
            }
        },
        document: {
            getElementById: getElement,
            createElement: () => makeElement('created'),
            addEventListener() {},
            querySelector(selector) {
                if (selector === 'input[name="tag-mode"]:checked') return { value: 'overwrite' };
                if (selector === 'input[name="caption-mode"]:checked') return { value: 'overwrite' };
                return null;
            },
            querySelectorAll: () => [],
        },
        localStorage: {
            getItem: (key) => localStore.get(key) ?? null,
            setItem: (key, value) => localStore.set(key, value),
        },
        fetch: async (url, options = {}) => {
            fetchCalls.push({ url, ...options });
            if (fetchHandler) return fetchHandler(url, options);
            return {
                ok: true,
                status: 200,
                async json() {
                    if (url.includes('/responses')) {
                        return {
                            output: [
                                {
                                    type: 'message',
                                    content: [
                                        {
                                            type: 'output_text',
                                            text: 'alpha beta gamma delta epsilon zeta eta',
                                        },
                                    ],
                                },
                            ],
                        };
                    }
                    if (url.includes('generativelanguage.googleapis.com')) {
                        return {
                            candidates: [
                                {
                                    content: {
                                        parts: [
                                            {
                                                text: 'alpha, beta, gamma',
                                            },
                                        ],
                                    },
                                },
                            ],
                        };
                    }
                    if (url.includes('api.anthropic.com')) {
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: 'alpha, beta, gamma',
                                },
                            ],
                        };
                    }
                    return {
                        choices: [
                            {
                                message: {
                                    content: 'alpha beta gamma delta epsilon zeta eta',
                                },
                            },
                        ],
                    };
                },
            };
        },
        confirm: () => true,
        URL: {
            createObjectURL: () => 'blob:mock',
            revokeObjectURL() {},
        },
    };

    vm.createContext(context);
    vm.runInContext(`${script}
globalThis.__tagpilotTest = {
    openSettings,
    updateSettingsFields,
    saveSettings,
    generateTags,
    getTagModel,
    getCaptionModel,
    openCrop,
    saveCrop,
    applyVllmModelPreset: typeof applyVllmModelPreset === 'function' ? applyVllmModelPreset : null,
    getTextProviderIds,
    autotagSingle,
    captionSingle,
    showPreview,
    cropPreviewImage,
    startBatchTagging,
    startBatchCaptioning,
    parseTags,
    formatTags,
    mergeTags,
    withTriggerWord,
    withoutTriggerWord,
    isBlankOrTriggerOnly,
    isSafeDatasetFileName,
    normalizeDatasetImageName,
    getDatasetTextFileName,
    updateInputPrefixLabels: typeof updateInputPrefixLabels === 'function' ? updateInputPrefixLabels : null,
    setDataset(value) { dataset = value; ensureDatasetItemIds(); },
    getDataset() { return dataset; },
};`, context);

    return { context, elements, fetchCalls, localStore, cropperInstances, croppedCanvasRequests };
}

function deferred() {
    let resolve;
    const promise = new Promise((done) => {
        resolve = done;
    });
    return { promise, resolve };
}


test('dataset ZIP and export names reject path traversal components', async () => {
    const { context } = await loadTagPilot();
    const api = context.__tagpilotTest;

    assert.equal(api.isSafeDatasetFileName('safe-image.jpg'), true);
    assert.equal(api.normalizeDatasetImageName('safe-image.jpeg'), 'safe-image.jpg');
    assert.equal(api.getDatasetTextFileName('safe-image.jpg'), 'safe-image.txt');

    for (const unsafeName of [
        '../outside.jpg',
        '..\\..\\outside.jpg',
        '/tmp/outside.jpg',
        'C:\\tmp\\outside.jpg',
        'nested/image.jpg',
        '\\server\\share\\outside.jpg',
        'almost..hidden.jpg',
    ]) {
        assert.equal(api.isSafeDatasetFileName(unsafeName), false, unsafeName);
        assert.equal(api.normalizeDatasetImageName(unsafeName), null, unsafeName);
        assert.equal(api.getDatasetTextFileName(unsafeName), null, unsafeName);
    }
});

test('batch tagging sends the custom tag prompt to the selected provider', async () => {
    const { context, elements, fetchCalls } = await loadTagPilot();
    elements.get('tag-system-prompt').value = 'CUSTOM TAG PROMPT';
    elements.get('setting-max-tags').value = '12';
    context.__tagpilotTest.setDataset([{ file: { name: 'image.png', type: 'image/png' }, tags: '', type: 'tags' }]);

    await context.__tagpilotTest.startBatchTagging();

    assert.equal(fetchCalls.length, 1);
    const body = JSON.parse(fetchCalls[0].body);
    assert.equal(body.input[0].content[0].text.includes('CUSTOM TAG PROMPT'), true);
});

test('batch captioning sends the custom caption prompt and enforces max caption words', async () => {
    const { context, elements, fetchCalls } = await loadTagPilot();
    elements.get('caption-system-prompt').value = 'CUSTOM CAPTION PROMPT';
    elements.get('setting-max-caption-len').value = '5';
    context.__tagpilotTest.setDataset([{ file: { name: 'image.png', type: 'image/png' }, tags: '', type: 'tags' }]);

    await context.__tagpilotTest.startBatchCaptioning();

    assert.equal(fetchCalls.length, 1);
    const body = JSON.parse(fetchCalls[0].body);
    assert.equal(body.input[0].content[0].text.includes('CUSTOM CAPTION PROMPT'), true);
    assert.equal(context.__tagpilotTest.getDataset()[0].tags, 'alpha beta gamma delta epsilon');
});

test('OpenAI uses the current Responses API vision model', async () => {
    const { context, elements, fetchCalls } = await loadTagPilot({ selectedModel: 'openai' });
    elements.get('tag-system-prompt').value = 'OPENAI TAG PROMPT';
    context.__tagpilotTest.setDataset([{ file: { name: 'image.png', type: 'image/png' }, tags: '', type: 'tags' }]);

    await context.__tagpilotTest.startBatchTagging();

    assert.equal(fetchCalls[0].url, 'https://api.openai.com/v1/responses');
    const body = JSON.parse(fetchCalls[0].body);
    assert.equal(body.model, 'gpt-5.4-mini');
    assert.equal(body.store, false);
    assert.equal(body.input[0].content[0].type, 'input_text');
    assert.equal(body.input[0].content[1].type, 'input_image');
});

test('Grok uses the xAI Responses API with the current vision model', async () => {
    const { context, elements, fetchCalls } = await loadTagPilot({ selectedModel: 'grok' });
    elements.get('tag-system-prompt').value = 'GROK TAG PROMPT';
    context.__tagpilotTest.setDataset([{ file: { name: 'image.png', type: 'image/png' }, tags: '', type: 'tags' }]);

    await context.__tagpilotTest.startBatchTagging();

    assert.equal(fetchCalls[0].url, 'https://api.x.ai/v1/responses');
    const body = JSON.parse(fetchCalls[0].body);
    assert.equal(body.model, 'grok-4.3');
    assert.equal(body.store, false);
    assert.equal(body.input[0].content[0].type, 'input_text');
    assert.equal(body.input[0].content[1].type, 'input_image');
});

test('Gemini uses the current stable multimodal model', async () => {
    const { context, elements, fetchCalls } = await loadTagPilot({ selectedModel: 'gemini' });
    elements.get('tag-system-prompt').value = 'GEMINI TAG PROMPT';
    context.__tagpilotTest.setDataset([{ file: { name: 'image.png', type: 'image/png' }, tags: '', type: 'tags' }]);

    await context.__tagpilotTest.startBatchTagging();

    assert.equal(fetchCalls[0].url.includes('/models/gemini-3.1-flash-lite:generateContent'), true);
    const body = JSON.parse(fetchCalls[0].body);
    assert.equal(body.contents[0].parts[0].text.includes('GEMINI TAG PROMPT'), true);
});

test('Claude uses the Anthropic Messages API with browser vision support', async () => {
    const { context, elements, fetchCalls } = await loadTagPilot({ selectedModel: 'claude' });
    elements.get('tag-system-prompt').value = 'CLAUDE TAG PROMPT';
    context.__tagpilotTest.setDataset([{ file: { name: 'image.png', type: 'image/png' }, tags: '', type: 'tags' }]);

    await context.__tagpilotTest.startBatchTagging();

    assert.equal(fetchCalls[0].url, 'https://api.anthropic.com/v1/messages');
    assert.equal(fetchCalls[0].headers['x-api-key'], 'test-key');
    assert.equal(fetchCalls[0].headers['anthropic-version'], '2023-06-01');
    assert.equal(fetchCalls[0].headers['anthropic-dangerous-direct-browser-access'], 'true');
    const body = JSON.parse(fetchCalls[0].body);
    assert.equal(body.model, 'claude-sonnet-4-5-20250929');
    assert.equal(body.max_tokens, 300);
    assert.equal(body.messages[0].content[0].type, 'image');
    assert.equal(body.messages[0].content[0].source.media_type, 'image/png');
    assert.equal(body.messages[0].content[1].text.includes('CLAUDE TAG PROMPT'), true);
});

test('vLLM uses the configured OpenAI-compatible chat completions endpoint', async () => {
    const { context, elements, fetchCalls } = await loadTagPilot({
        selectedModel: 'vllm',
        initialStore: {
            vllmApiKey: 'sk-pod123',
            vllmEndpoint: 'https://pod123-8000.proxy.runpod.net/v1/chat/completions',
            vllmModelType: 'Qwen/Qwen3-8B',
        },
    });
    elements.get('tag-system-prompt').value = 'VLLM TAG PROMPT';
    context.__tagpilotTest.setDataset([{ file: { name: 'image.png', type: 'image/png' }, tags: '', type: 'tags' }]);

    await context.__tagpilotTest.startBatchTagging();

    assert.equal(fetchCalls[0].url, 'https://pod123-8000.proxy.runpod.net/v1/chat/completions');
    assert.equal(fetchCalls[0].headers.Authorization, 'Bearer sk-pod123');
    const body = JSON.parse(fetchCalls[0].body);
    assert.equal(body.model, 'Qwen/Qwen3-8B');
    assert.equal(body.max_tokens, 300);
    assert.equal(body.messages[0].content[0].type, 'text');
    assert.equal(body.messages[0].content[0].text.includes('VLLM TAG PROMPT'), true);
    assert.equal(body.messages[0].content[1].type, 'image_url');
    assert.equal(body.messages[0].content[1].image_url.url, 'data:image/png;base64,AAAA');
});

test('LLM providers are registered in one provider map', async () => {
    const { context } = await loadTagPilot();

    assert.deepEqual(Array.from(context.__tagpilotTest.getTextProviderIds()), ['gemini', 'grok', 'openai', 'claude', 'vllm']);
});

test('settings modal exposes tagging options, captioning options, and provider key table', async () => {
    const html = await readFile(new URL('../tagpilot.html', import.meta.url), 'utf8');

    assert.match(html, /Tagging Options/);
    assert.match(html, /Captioning Options/);
    assert.match(html, /Crop Options/);
    assert.match(html, /id="tag-default-model"/);
    assert.match(html, /id="caption-default-model"/);
    assert.match(html, /id="crop-aspect-ratio"/);
    assert.match(html, /id="crop-width"/);
    assert.match(html, />Free form</);
    assert.match(html, />1:1 Square</);
    assert.match(html, />16:9 Landscape</);
    assert.match(html, />3:2 Landscape</);
    assert.match(html, />4:3 Landscape</);
    assert.match(html, />21:9 Widescreen</);
    assert.match(html, />9:16 Portrait</);
    assert.match(html, />2:3 Portrait</);
    assert.match(html, />3:4 Portrait</);
    assert.match(html, /id="model-api-key-table"/);
    assert.match(html, /id="api-key-gemini"/);
    assert.match(html, /id="api-key-grok"/);
    assert.match(html, /id="api-key-openai"/);
    assert.match(html, /id="api-key-claude"/);
    assert.match(html, /id="api-key-vllm"/);
    assert.match(html, /id="vllm-endpoint"/);
    assert.match(html, /id="vllm-model-preset"/);
    assert.match(html, /id="vllm-model-type"/);
    assert.match(html, /Qwen\/Qwen2\.5-VL-3B-Instruct/);
    assert.match(html, /Qwen\/Qwen3-VL-4B-Instruct/);
    assert.match(html, /Qwen\/Qwen3\.5-9B-Instruct/);
    assert.match(html, /google\/gemma-3-4b-it/);
    assert.match(html, /mistralai\/Pixtral-12B-2409/);
    assert.match(html, /id="api-key-wd14"/);
    assert.doesNotMatch(html, /id="modelSelect"/);
    assert.doesNotMatch(html, /id="apiKeyInput"/);
});

test('settings key table loads saved provider API keys', async () => {
    const { context, elements } = await loadTagPilot({
        selectedModel: 'gemini',
        initialStore: {
            geminiApiKey: 'gemini-key',
            grokApiKey: 'grok-key',
            openaiApiKey: 'openai-key',
            claudeApiKey: 'claude-key',
            vllmApiKey: 'vllm-key',
            vllmEndpoint: 'https://pod123-8000.proxy.runpod.net/v1/chat/completions',
            vllmModelType: 'Qwen/Qwen3-8B',
            wd14ApiKey: 'wd14-key',
        },
    });

    context.__tagpilotTest.openSettings();

    assert.equal(elements.get('api-key-gemini').value, 'gemini-key');
    assert.equal(elements.get('api-key-grok').value, 'grok-key');
    assert.equal(elements.get('api-key-openai').value, 'openai-key');
    assert.equal(elements.get('api-key-claude').value, 'claude-key');
    assert.equal(elements.get('api-key-vllm').value, 'vllm-key');
    assert.equal(elements.get('vllm-endpoint').value, 'https://pod123-8000.proxy.runpod.net/v1/chat/completions');
    assert.equal(elements.get('vllm-model-type').value, 'Qwen/Qwen3-8B');
    assert.equal(elements.get('api-key-wd14').value, 'wd14-key');
});

test('settings can save vLLM endpoint, model type, and API key', async () => {
    const { context, elements, fetchCalls, localStore } = await loadTagPilot({ selectedModel: 'gemini' });

    context.__tagpilotTest.openSettings();
    elements.get('tag-default-model').value = 'vllm';
    elements.get('caption-default-model').value = 'vllm';
    elements.get('api-key-vllm').value = 'sk-custom';
    elements.get('vllm-endpoint').value = 'https://custom-8000.proxy.runpod.net';
    elements.get('vllm-model-type').value = 'Qwen/Qwen3-8B';

    context.__tagpilotTest.saveSettings();

    assert.equal(localStore.get('tagModel'), 'vllm');
    assert.equal(localStore.get('captionModel'), 'vllm');
    assert.equal(localStore.get('vllmApiKey'), 'sk-custom');
    assert.equal(localStore.get('vllmEndpoint'), 'https://custom-8000.proxy.runpod.net');
    assert.equal(localStore.get('vllmModelType'), 'Qwen/Qwen3-8B');

    context.__tagpilotTest.setDataset([{ file: { name: 'image.png', type: 'image/png' }, tags: '', type: 'tags' }]);
    await context.__tagpilotTest.startBatchTagging();

    assert.equal(fetchCalls[0].url, 'https://custom-8000.proxy.runpod.net/v1/chat/completions');
    assert.equal(fetchCalls[0].headers.Authorization, 'Bearer sk-custom');
    assert.equal(JSON.parse(fetchCalls[0].body).model, 'Qwen/Qwen3-8B');
});

test('vLLM model presets fill and save the model type field', async () => {
    const { context, elements, localStore } = await loadTagPilot();

    context.__tagpilotTest.openSettings();
    elements.get('vllm-model-preset').value = 'google/gemma-3-4b-it';
    context.__tagpilotTest.applyVllmModelPreset();
    elements.get('api-key-vllm').value = 'sk-custom';
    elements.get('vllm-endpoint').value = 'https://custom-8000.proxy.runpod.net';

    assert.equal(elements.get('vllm-model-type').value, 'google/gemma-3-4b-it');

    context.__tagpilotTest.saveSettings();

    assert.equal(localStore.get('vllmModelType'), 'google/gemma-3-4b-it');
});

test('settings can save separate default models for tagging and captioning', async () => {
    const { context, elements, fetchCalls, localStore } = await loadTagPilot({ selectedModel: 'gemini' });

    context.__tagpilotTest.openSettings();
    elements.get('tag-default-model').value = 'openai';
    elements.get('caption-default-model').value = 'claude';
    elements.get('setting-max-tags').value = '7';
    elements.get('setting-max-caption-len').value = '6';
    elements.get('tag-system-prompt').value = 'TAG DEFAULT PROMPT';
    elements.get('caption-system-prompt').value = 'CAPTION DEFAULT PROMPT';
    elements.get('api-key-openai').value = 'openai-table-key';
    elements.get('api-key-claude').value = 'claude-table-key';

    context.__tagpilotTest.saveSettings();

    assert.equal(localStore.get('tagModel'), 'openai');
    assert.equal(localStore.get('captionModel'), 'claude');
    assert.equal(context.__tagpilotTest.getTagModel(), 'openai');
    assert.equal(context.__tagpilotTest.getCaptionModel(), 'claude');

    context.__tagpilotTest.setDataset([{ file: { name: 'image.png', type: 'image/png' }, tags: '', type: 'tags' }]);
    await context.__tagpilotTest.startBatchTagging();
    await context.__tagpilotTest.startBatchCaptioning();

    assert.equal(fetchCalls[0].url, 'https://api.openai.com/v1/responses');
    assert.equal(fetchCalls[0].headers.Authorization, 'Bearer openai-table-key');
    assert.equal(JSON.parse(fetchCalls[0].body).input[0].content[0].text.includes('TAG DEFAULT PROMPT'), true);
    assert.equal(fetchCalls[1].url, 'https://api.anthropic.com/v1/messages');
    assert.equal(fetchCalls[1].headers['x-api-key'], 'claude-table-key');
    assert.equal(JSON.parse(fetchCalls[1].body).messages[0].content[1].text.includes('CAPTION DEFAULT PROMPT'), true);
});

test('settings can save crop size ratio and output width', async () => {
    const { context, elements, localStore } = await loadTagPilot();

    context.__tagpilotTest.openSettings();
    elements.get('crop-aspect-ratio').value = '21:9';
    elements.get('crop-width').value = '1536';

    context.__tagpilotTest.saveSettings();

    assert.equal(localStore.get('cropAspectRatio'), '21:9');
    assert.equal(localStore.get('cropWidth'), '1536');
});

test('DeepDanbooru uses the Hugging Face Gradio API and parses returned tags', async () => {
    const { context, fetchCalls } = await loadTagPilot({
        initialStore: {
            tagModel: 'deepdanbooru',
            ddThreshold: '0.6',
        },
        fetchHandler: async (url) => {
            if (url.endsWith('/upload')) {
                return {
                    ok: true,
                    status: 200,
                    async json() {
                        return ['/tmp/gradio/uploaded/image.png'];
                    },
                };
            }
            if (url.endsWith('/call/v2/predict')) {
                return {
                    ok: true,
                    status: 200,
                    async json() {
                        return { event_id: 'event-123' };
                    },
                };
            }
            if (url.endsWith('/call/predict/event-123')) {
                return {
                    ok: true,
                    status: 200,
                    async text() {
                        return 'event: complete\ndata: [{"label":"solo","confidences":[{"label":"solo","confidence":0.9},{"label":"low_score","confidence":0.4}]},{"solo":0.9,"low_score":0.4},"solo, low_score"]\n\n';
                    },
                };
            }
            throw new Error(`Unexpected URL: ${url}`);
        },
    });

    const tags = await context.__tagpilotTest.generateTags({ name: 'image.png', type: 'image/png' });

    assert.equal(tags, 'solo');
    assert.equal(fetchCalls[0].url, 'https://hysts-deepdanbooru.hf.space/gradio_api/upload');
    assert.equal(fetchCalls[0].method, 'POST');
    assert.equal(fetchCalls[0].body.entries[0].name, 'files');
    assert.equal(fetchCalls[0].body.entries[0].filename, 'image.png');
    assert.equal(fetchCalls[1].url, 'https://hysts-deepdanbooru.hf.space/gradio_api/call/v2/predict');
    assert.equal(fetchCalls[1].method, 'POST');
    const predictBody = JSON.parse(fetchCalls[1].body);
    assert.equal(predictBody.image.path, '/tmp/gradio/uploaded/image.png');
    assert.equal(predictBody.image.orig_name, 'image.png');
    assert.equal(predictBody.image.mime_type, 'image/png');
    assert.equal(predictBody.image.meta._type, 'gradio.FileData');
    assert.equal(predictBody.score_threshold, 0.6);
    assert.equal(fetchCalls[2].url, 'https://hysts-deepdanbooru.hf.space/gradio_api/call/predict/event-123');
});

test('OpenAI HTTP 401 returns a useful provider error', async () => {
    const { context } = await loadTagPilot({
        selectedModel: 'openai',
        fetchHandler: async () => ({
            ok: false,
            status: 401,
            async json() {
                return { error: { message: 'Incorrect API key provided' } };
            },
        }),
    });

    await assert.rejects(
        () => context.__tagpilotTest.generateTags({ name: 'image.png', type: 'image/png' }),
        /OpenAI API error 401: Incorrect API key provided/
    );
});

test('single-image tagging shows processing state while the request is pending', async () => {
    const pending = deferred();
    const { context } = await loadTagPilot({
        fetchHandler: async () => pending.promise,
    });
    context.__tagpilotTest.setDataset([{ file: { name: 'image.png', type: 'image/png' }, tags: '', type: 'tags' }]);
    const itemId = context.__tagpilotTest.getDataset()[0].id;

    const operation = context.__tagpilotTest.autotagSingle(itemId);

    assert.equal(context.__tagpilotTest.getDataset()[0].processing, 'Tagging');

    pending.resolve({
        ok: true,
        status: 200,
        async json() {
            return { output_text: 'alpha, beta' };
        },
    });
    await operation;

    assert.equal(context.__tagpilotTest.getDataset()[0].processing, null);
});

test('single-image captioning shows processing state while the request is pending', async () => {
    const pending = deferred();
    const { context } = await loadTagPilot({
        fetchHandler: async () => pending.promise,
    });
    context.__tagpilotTest.setDataset([{ file: { name: 'image.png', type: 'image/png' }, tags: '', type: 'tags' }]);
    const itemId = context.__tagpilotTest.getDataset()[0].id;

    const operation = context.__tagpilotTest.captionSingle(itemId);

    assert.equal(context.__tagpilotTest.getDataset()[0].processing, 'Captioning');

    pending.resolve({
        ok: true,
        status: 200,
        async json() {
            return { output_text: 'alpha beta gamma' };
        },
    });
    await operation;

    assert.equal(context.__tagpilotTest.getDataset()[0].processing, null);
});

test('settings launcher is labeled and positioned at the top left', async () => {
    const html = await readFile(new URL('../tagpilot.html', import.meta.url), 'utf8');

    assert.match(html, /\.settings-icon \{[^}]*left: 10px;/s);
    assert.match(html, /id="settings-icon"[^>]*>[\s\S]*Settings[\s\S]*<\/div>/);
});

test('Lora Pilot family link is fixed at the bottom right', async () => {
    const html = await readFile(new URL('../tagpilot.html', import.meta.url), 'utf8');

    assert.match(html, /id="lora-pilot-family-link"/);
    assert.match(html, /Part of\s*<a[^>]*>Lora Pilot<\/a>\s*family/);
    assert.match(html, /href="https:\/\/github\.com\/vavo\/lora-pilot"/);
    assert.match(html, /class="[^"]*fixed[^"]*bottom-3[^"]*right-3/);
});

test('trigger word and dataset name labels hide while values are entered', async () => {
    const { context, elements } = await loadTagPilot();
    const updateInputPrefixLabels = context.__tagpilotTest.updateInputPrefixLabels;

    assert.equal(typeof updateInputPrefixLabels, 'function');

    elements.get('trigger-word-input').value = 'ohwx';
    elements.get('dataset-name-input').value = 'portraits';

    updateInputPrefixLabels();

    assert.equal(elements.get('trigger-word-label').style.visibility, 'hidden');
    assert.equal(elements.get('dataset-name-label').style.visibility, 'hidden');
    assert.equal(elements.get('trigger-word-input').style.paddingLeft, '0.75rem');
    assert.equal(elements.get('dataset-name-input').style.paddingLeft, '0.75rem');

    elements.get('trigger-word-input').value = '';
    elements.get('dataset-name-input').value = '';

    updateInputPrefixLabels();

    assert.equal(elements.get('trigger-word-label').style.visibility, '');
    assert.equal(elements.get('dataset-name-label').style.visibility, '');
    assert.equal(elements.get('trigger-word-input').style.paddingLeft, '');
    assert.equal(elements.get('dataset-name-input').style.paddingLeft, '');
});

test('tag pill rendering does not interpolate tag text into innerHTML', async () => {
    const html = await readFile(new URL('../tagpilot.html', import.meta.url), 'utf8');

    assert.doesNotMatch(html, /pill\.innerHTML\s*=\s*`\$\{tag\}/);
    assert.doesNotMatch(html, /onclick="deleteTagGlobally\('\$\{tag\}'\)"/);
    assert.doesNotMatch(html, /onclick="removeTagFromImage\(\$\{index\}, \$\{ti\}\)"/);
});

test('tag and caption batch flows share one runner', async () => {
    const html = await readFile(new URL('../tagpilot.html', import.meta.url), 'utf8');

    assert.match(html, /async function runBatchProcessing\(/);
    assert.match(html, /async function startBatchTagging\(\)[\s\S]*runBatchProcessing\(/);
    assert.match(html, /async function startBatchCaptioning\(\)[\s\S]*runBatchProcessing\(/);
});

test('object URLs are cached and revoked through helper functions', async () => {
    const html = await readFile(new URL('../tagpilot.html', import.meta.url), 'utf8');

    assert.match(html, /function getFileObjectUrl\(/);
    assert.match(html, /function revokeFileObjectUrl\(/);
    assert.match(html, /function clearFileObjectUrls\(/);
    assert.match(html, /URL\.revokeObjectURL/);
    assert.doesNotMatch(html, /const imageUrl = URL\.createObjectURL\(item\.file\)/);
});

test('single-image card actions are wired by stable item ids', async () => {
    const html = await readFile(new URL('../tagpilot.html', import.meta.url), 'utf8');

    assert.match(html, /function createDatasetItemId\(/);
    assert.match(html, /function findDatasetItemById\(/);
    assert.match(html, /data-id="\$\{item\.id\}"/);
    assert.doesNotMatch(html, /autotagSingle\(index\)/);
    assert.doesNotMatch(html, /captionSingle\(index\)/);
    assert.doesNotMatch(html, /openCrop\(index\)/);
    assert.doesNotMatch(html, /removeImage\(index\)/);
});

test('tag utility helpers normalize tags and trigger words', async () => {
    const { context } = await loadTagPilot();
    const helpers = context.__tagpilotTest;

    assert.deepEqual(Array.from(helpers.parseTags(' alpha, , beta, alpha ')), ['alpha', 'beta', 'alpha']);
    assert.equal(helpers.formatTags([' alpha ', '', 'beta']), 'alpha, beta');
    assert.deepEqual(Array.from(helpers.mergeTags('alpha, beta', 'beta, gamma')), ['alpha', 'beta', 'gamma']);
    assert.equal(helpers.withTriggerWord('beta, alpha', 'alpha'), 'alpha, beta');
    assert.equal(helpers.withoutTriggerWord('alpha, beta', 'alpha'), 'beta');
    assert.equal(helpers.isBlankOrTriggerOnly('alpha', 'alpha'), true);
    assert.equal(helpers.isBlankOrTriggerOnly('alpha, beta', 'alpha'), false);
});

test('preview modal can start cropping the previewed image', async () => {
    const html = await readFile(new URL('../tagpilot.html', import.meta.url), 'utf8');
    assert.match(html, /id="preview-crop"/);

    const { context, elements } = await loadTagPilot();
    context.__tagpilotTest.setDataset([{ file: { name: 'image.png', type: 'image/png' }, tags: '', type: 'tags' }]);
    const itemId = context.__tagpilotTest.getDataset()[0].id;

    context.__tagpilotTest.showPreview('blob:preview', itemId);

    assert.equal(elements.get('preview-image').src, 'blob:preview');
    assert.equal(elements.get('preview-modal').style.display, 'flex');

    context.__tagpilotTest.cropPreviewImage();

    assert.equal(elements.get('preview-modal').style.display, 'none');
    assert.equal(elements.get('crop-modal').style.display, 'flex');
    assert.equal(elements.get('crop-image').src, 'blob:mock');
});

test('crop uses the selected ratio and output width', async () => {
    const { context, cropperInstances, croppedCanvasRequests } = await loadTagPilot({
        initialStore: {
            cropAspectRatio: '16:9',
            cropWidth: '1344',
        },
    });
    context.__tagpilotTest.setDataset([{ file: { name: 'image.png', type: 'image/png' }, tags: '', type: 'tags' }]);
    const itemId = context.__tagpilotTest.getDataset()[0].id;

    context.__tagpilotTest.openCrop(itemId);

    assert.equal(cropperInstances[0].options.aspectRatio, 16 / 9);

    await context.__tagpilotTest.saveCrop();

    assert.equal(croppedCanvasRequests[0].width, 1344);
    assert.equal(croppedCanvasRequests[0].height, 756);
    assert.equal(context.__tagpilotTest.getDataset()[0].file.name, 'image.png');
    assert.equal(context.__tagpilotTest.getDataset()[0].file.type, 'image/png');
});
