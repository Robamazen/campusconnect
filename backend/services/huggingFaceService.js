const CATEGORIES = ['Academic', 'Social', 'Sports', 'Tech', 'Arts', 'Volunteering', 'Other'];

const HF_API_URL = 'https://router.huggingface.co/hf-inference/models/facebook/bart-large-mnli';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const callHuggingFace = async (description) => {
    return fetch(HF_API_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.HF_API_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            inputs: description,
            parameters: {candidate_labels: CATEGORIES}
        })
    });
};

const classifyEventCategories = async (description) => {
    if(!process.env.HF_API_TOKEN){
        console.warn('HF_API_TOKEN not set — defaulting category to "Other"');
        return 'Other';
    }

    if (!description || description.trim().length === 0) {
        return 'Other';
    }

    try {
        let response = await callHuggingFace(description);

        if(response.status === 503){
            console.warn('Hugging Face model still loading, retrying in 2s...');
            await sleep(2000);
            response = await callHuggingFace(description);
        }

        if (!response.ok) {
            console.error(`Hugging Face API error: ${response.status} ${response.statusText}`);
            return 'Other';
        }

        const data = await response.json();
        const topLabel = Array.isArray(data) && data.length > 0 ? data[0].label : undefined;
        if (topLabel && CATEGORIES.includes(topLabel)) {
            return topLabel;
        }

        return 'Other';
    } catch (err){
        console.error('Hugging Face classification failed:', err.message, err.cause || '');
        return 'Other';
    }
};


module.exports = {classifyEventCategories, CATEGORIES};