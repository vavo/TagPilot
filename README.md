# **TagPilot**

**A powerful, browser-based tool for creating and managing training datasets for AI image generation, specifically for technologies like LoRA training.**

TagPilot streamlines the tedious process of preparing images for training by providing a suite of powerful, client-side tools, including AI-powered auto-tagging, duplicate detection, and a robust image editor. It runs entirely in your browser, keeping your data private and secure.

## **Key Features**

* **Flexible Uploads**: Load individual images or upload a complete dataset (images \+ existing `.txt` tags) in a `.zip` file.  
* **AI Auto-Tagging**: Uses the Google Gemini API to intelligently generate descriptive, high-quality tags for your images based on expert-defined rules.  
* **Interactive Tag Editor**: Manage tags as individual elements. Easily add, remove, and edit tags in a clean, modern interface.  
* **Built-in Image Cropper**: A simple but powerful cropper to perfect the composition of each image in your dataset.  
* **Secure Duplicate Detection**: Identifies and skips duplicate images based on their content (hash), not their filename. This process is done **100% locally** in your browser and never sends image data to an external server.  
* **Live Tag Summary**: Get a real-time overview of your dataset with a summary of all tags and their frequencies.  
* **Structured Export**: Downloads your completed dataset as a `.zip` file, perfectly structured for training tools like Kohya\_ss (`1_datasetname/datasetname001.jpg`, `datasetname001.txt`, etc.).  
* **Secure & Private**: Runs entirely in your browser. Your images are only sent to an external API when you explicitly use the auto-tagging feature. Your API key is managed locally and is never committed to the repository.

## **Setup & Installation**

Getting TagPilot running is simple. Since it's a client-side application, there is no server to set up.

**Clone the Repository**  
git clone https://github.com/vavo/TagPilot.git
cd TagPilot
   
1. **Create Your Configuration File** This project uses a local, untracked `config.js` file to keep your API key secure.
2. Copy the example file:  
cp config.example.js config.js
   
3. **Add Your API Key**  
   * Get a free Google Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

Open the `config.js` file you just created and paste your API key into the `userApiKey` constant.  
// config.js  
const userApiKey \= "YOUR\_GEMINI\_API\_KEY\_GOES\_HERE";

4. **Run the Application**  
   * Simply open the `tagpilot.html` file in your web browser. That's it\!
   * Alternately you can use Python to create a webserver on some port - for example:
     python -m http.server 3333

     then access your TagPilot at http://localhost:3333/tagpilot.html

## **Usage Workflow**

1. **Load Images**: Upload your photos or a pre-tagged `.zip` dataset. You can continue adding images at any time.  
2. **Set Dataset Name**: Enter a trigger word or name for your dataset. This will be used as the first tag during auto-tagging and for naming the export files.  
3. **Auto-Tag**: Click **"Auto-tag All"** to have the AI generate tags for any untagged images. You can also tag images individually.  
4. **Refine**: Manually add, remove, or edit tags to perfect your captions.  
5. **Crop**: Use the crop tool on any image to adjust its framing.  
6. **Review**: Check the **Tag Summary** at the bottom to analyze tag frequency and ensure your dataset is well-balanced.  
7. **Export**: Click **"Export as ZIP"** to download your production-ready dataset.

## **Technology Stack**

* **HTML, CSS, JavaScript**: The core "vanilla" stack. No complex frameworks.  
* **Tailwind CSS**: For all styling and layout.  
* **JSZip**: For client-side `.zip` file processing.  
* **Cropper.js**: For the image cropping functionality.  
* **Google Gemini API**: Powers the AI auto-tagging feature.  
* **Web Crypto API**: Used for secure, local duplicate image detection.

Feel free to contribute or open issues if you find bugs or have ideas for new features\!

