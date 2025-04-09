const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5005;

app.use(cors());

const folderPath = path.join(__dirname, "..", "prompt-results");

app.get("/api/models", (req, res) => {
  console.log("📂 Checking models inside:", folderPath);

  if (!fs.existsSync(folderPath)) {
    console.error("❌ ERROR: Directory 'prompt-results' not found:", folderPath);
    return res.status(500).json({ error: `Directory 'prompt-results' not found at ${folderPath}` });
  }

  fs.readdir(folderPath, (err, folders) => {
    if (err) {
      console.error("❌ ERROR: Unable to scan directories:", err);
      return res.status(500).json({ error: "Unable to scan model directories" });
    }

    const models = folders.filter(folder =>
      fs.statSync(path.join(folderPath, folder)).isDirectory()
    );

    console.log("✅ Models found:", models);
    res.json(models);
  });
});

app.get("/api/models/:modelName/files", (req, res) => {
  let { modelName } = req.params;

  // Decode special characters in URL
  modelName = decodeURIComponent(modelName);
  console.log(`📂 Checking files for model: '${modelName}'`);

  const modelPath = path.join(folderPath, modelName);

  // Debugging: Print available model folders
  const availableModels = fs.readdirSync(folderPath).filter(folder => 
    fs.statSync(path.join(folderPath, folder)).isDirectory()
  );
  console.log("✅ Available Models:", availableModels);

  // Check if model exists
  if (!availableModels.includes(modelName)) {
    console.error(`❌ ERROR: Model '${modelName}' not found in`, availableModels);
    return res.status(404).json({ error: `Model '${modelName}' not found` });
  }

  fs.readdir(modelPath, (err, files) => {
    if (err) {
      console.error("❌ ERROR: Unable to scan files:", err);
      return res.status(500).json({ error: "Unable to scan files" });
    }

    // Filter only JSON files
    const jsonFiles = files.filter(file => file.endsWith(".json"));

    console.log(`✅ Found JSON files for model '${modelName}':`, jsonFiles);
    res.json(jsonFiles);
  });
});

app.get("/api/models/:modelName/files/:filename", (req, res) => {
  const { modelName, filename } = req.params;
  const filePath = path.join(folderPath, modelName, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: `File '${filename}' not found in model '${modelName}'` });
  }

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) return res.status(500).json({ error: "Failed to read file" });
    res.json(JSON.parse(data));
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server Running at http://localhost:${PORT}`);
});