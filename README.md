# **TagPilot ✈️**

**A powerful, browser-based tool for creating and managing training datasets for AI image generation, specifically for technologies like LoRA.**  
TagPilot streamlines the tedious process of preparing images for training by providing a suite of powerful, client-side tools, including AI-powered auto-tagging, duplicate detection, and a robust image editor. It runs entirely in your browser, keeping your data private and secure.

## **Key Features**

* **Flexible Uploads**: Load individual images or upload a complete dataset (images \+ existing .txt tags) in a .zip file. You can add more files incrementally at any time.  
* **Global Trigger Word**: Easily set a trigger word that is automatically applied as the first tag to every image in your dataset.  
* **Smart AI Auto-Tagging**: Uses the **Google Gemini API** (specifically the latest 2.5 Flash model) to generate high-quality tags.  
  * **Batch Control**: Choose to **Ignore**, **Append to**, or **Overwrite** existing tags.  
  * **Progress Tracking**: Includes a progress bar and a "Stop" button to cancel the process if needed.  
* **Advanced Tag Viewer**: A collapsible panel that shows every tag used in your dataset along with its frequency.  
  * **Global Delete**: Click the x on any tag in the viewer to instantly remove it from **every image** in the dataset.  
* **Interactive Tag Editor**: Manage tags on individual images using a clean, interactive interface.  
* **Free-Form Cropping**: Built-in cropper allows you to adjust the composition of your images with any aspect ratio (not locked to square).  
* **Secure Duplicate Detection**: Identifies and skips duplicate images based on their content (hash), not their filename. This process is done **100% locally**.  
* **Structured Export**: Downloads your completed dataset as a .zip file, perfectly structured for training tools like Kohya\_ss (1\_datasetname/datasetname001.jpg, datasetname001.txt, etc.).  
* **Secure & Private**: Runs entirely in your browser. Images are only sent to the external API when you explicitly use the auto-tagging feature. Your API key is stored locally and never committed to the repository.

## **Setup & Installation**

Getting TagPilot running is simple. Since it's a client-side application, there is no complex backend server to set up.

1. **Clone the Repository**  
   git clone \[https://github.com/vavo/TagPilot.git\](https://github.com/vavo/TagPilot.git)  
   cd TagPilot

2. Create Your Configuration File  
   This project uses a local, untracked config.js file to keep your API key secure.  
   Copy the example file:  
   cp config.example.js config.js

3. **Add Your API Key**  
   * Get a free Google Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).  
   * Open the config.js file you just created and paste your API key into the userApiKey constant.  
     // config.js  
     const userApiKey \= "YOUR\_GEMINI\_API\_KEY\_GOES\_HERE";

4. **Run the Application**  
   * Simply open the tagpilot.html file in your web browser. That's it\!  
   * Alternatively, you can use Python to create a simple local webserver:  
     python \-m http.server 3333

     Then access TagPilot at http://localhost:3333/tagpilot.html

## **Usage Workflow**

1. **Load Images**: Upload photos or a pre-tagged .zip dataset. The tool checks for duplicates automatically.  
2. **Set Trigger Word**: Enter your desired trigger word (e.g., ohwx man) in the input box. This ensures it is always the first tag for every image.  
3. **Set Dataset Name**: Enter the filename prefix for your export (e.g., my-lora-v1).  
4. **Auto-Tag**: Click **"Tag All"** to open the batch settings:  
   * Set the maximum number of tags per image.  
   * Choose how to handle existing tags: **Ignore** (skip tagged), **Append** (add new tags), or **Overwrite** (replace all tags).  
5. **Review & Refine**:  
   * Use the **Tag Viewer** at the bottom to see tag distribution. Remove unwanted tags globally by clicking them.  
   * Manually edit tags on specific cards if needed.  
   * Use the **Crop** button to adjust image framing.  
6. **Export**: Click **"Export as ZIP"** to download your production-ready dataset.

## **Technology Stack**

* **HTML, CSS, JavaScript**: The core "vanilla" stack. No complex frameworks.  
* **Tailwind CSS**: For all styling and layout.  
* **JSZip**: For client-side .zip file processing.  
* **Cropper.js**: For the image cropping functionality.  
* **Google Gemini API**: Powers the AI auto-tagging feature (Default: Gemini 2.5 Flash Preview).  
* **Web Crypto API**: Used for secure, local duplicate image detection.

Feel free to contribute or open issues if you find bugs or have ideas for new features\!
