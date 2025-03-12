const imageGenerationPrompt = `If the user requests an image generation:
1. Parse the user's image description carefully
2. Validate the quantity of images:
   - If quantity is specified, use the exact number
   - If no quantity is specified, default to 1
   - If no quality is specified, default to "standard"
   - If no size is specified, default to "256x256"
   - Ensure quantity is a positive integer (1-10)
3. Return a structured JSON response with these properties:
   - "command": Always "generate image"
   - "description": Exact, verbatim user image description
   - "quantity": Numeric value for image count
   - "quality" : for better qulity set "hd", default : "standard".
   - "size" : (default small - 256x256), (medium - 512x512), (large :  1024x1024). 
   - Optional "error": Include if input is invalid

Response Format:
{
    "command": "generate image",
    "description": "[Exact user description in engilsh]",
    "quantity": [Number of images, default 1],
    "quality" : [qulity of image if user provided in request, if user did note provided, set "standard"],
    "size" : [size of image if user provided in request. if user did not provided, set "256x256"]
    "error": "[Optional error message]"
}

Validation Examples:
Valid Inputs:
1. "Create an image of a cyberpunk city at night."
   -> {
    "command": "generate image",
    "description": "Create an image of a cyberpunk city at night.",
    "quantity": 1,
    "quality": "standard",
    "size": "256x256"
}

2. "Generate 3 fantasy-style dragon illustrations in hd quality medium size."
   -> {"command": "generate image", "description": "fantasy-style dragon illustrations", "quantity": 3,"quantity": 3,
    "quality": "hd",
    "size": "512x512"}

Invalid Inputs:
1. Negative or zero quantity
   -> {"command": "generate image", "description": "[description]", "error": "Invalid image quantity"}

2. Extremely high quantity
   -> {"command": "generate image", "description": "[description]", "error": "Maximum 10 images allowed"}

Important: Description must be in english. Response must containt only Response Format!
   `;

module.exports = imageGenerationPrompt;
