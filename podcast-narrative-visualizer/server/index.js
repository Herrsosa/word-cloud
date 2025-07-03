const express = require('express');
const multer = require('multer');
const cors = require('cors');
const mammoth = require('mammoth');
const OpenAI = require('openai');
const Tsne = require('tsne-js');

require('dotenv').config();

const app = express();
const port = 5001;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.use(cors());
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- Helper function to calculate Cosine Similarity ---
function cosineSimilarity(vecA, vecB) {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }
  return dotProduct / (magnitudeA * magnitudeB);
}

app.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    try {
        let text = '';
        if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const result = await mammoth.extractRawText({ buffer: req.file.buffer });
            text = result.value;
        } else {
            text = req.file.buffer.toString('utf8');
        }

        const truncatedText = text.substring(0, 12000);

        // --- Step 1: Use OpenAI to Extract Topics, Importance, and Context ---
        const chatResponse = await openai.chat.completions.create({
            model: 'gpt-4o',
            response_format: { type: "json_object" },
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert NLP analyst. Analyze a podcast transcript and identify the 20-30 most important, distinct topics. Return a JSON object with a single key "topics", which is an array of objects. Each object must have three keys: "topic" (the string), "importance" (a number from 1 to 10), and "context" (a single, representative sentence from the transcript where this topic was discussed).'
                },
                {
                    role: 'user',
                    content: `Here is the transcript: """${truncatedText}"""`
                }
            ]
        });

        const topicData = JSON.parse(chatResponse.choices[0].message.content).topics;

        const topics = topicData.map(t => t.topic);

        if (!topics || topics.length < 2) {
            return res.status(400).send('Could not identify enough topics from the text.');
        }

        // --- Step 2: Get Vector Embeddings for the Topics ---
        const embeddingResponse = await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: topics,
        });
        const embeddingsArray = embeddingResponse.data.map(d => d.embedding);

        // --- Step 3: Calculate Edges/Connections BEFORE Dimensionality Reduction ---
        const edges = [];
        const similarityThreshold = 0.82; // Adjust this threshold (0.0 to 1.0) to get more/fewer connections

        for (let i = 0; i < embeddingsArray.length; i++) {
            for (let j = i + 1; j < embeddingsArray.length; j++) {
                const similarity = cosineSimilarity(embeddingsArray[i], embeddingsArray[j]);
                if (similarity > similarityThreshold) {
                    edges.push({ from: i, to: j, similarity: similarity });
                }
            }
        }
        
        // --- Step 4: Dimensionality Reduction with t-SNE ---
        const tsne = new Tsne({
            dim: 3,
            perplexity: Math.min(15, topics.length - 1),
            earlyExaggeration: 4.0,
            learningRate: 100.0,
            nIter: 1000,
            metric: 'euclidean'
        });
        tsne.init({ data: embeddingsArray, type: 'dense' });
        tsne.run();
        const output = tsne.getOutputScaled();

        // --- Step 5: Format and Send Response with NODES and EDGES ---
        const nodes = topicData.map((t, i) => ({
            text: t.topic,
            position: output[i], // Increased scale for better spread
            size: t.importance 
        }));
        
        res.json({ nodes, edges }); // Send both nodes and edges to the client

    } catch (error) {
        console.error('Processing error:', error);
        res.status(500).send('Error processing the file with OpenAI.');
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:5001`);
});