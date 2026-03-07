/**
 * Uploads a base64 encoded image string to Cloudinary and returns the secure URL.
 * Requires the image to be prefixed with `data:image/png;base64,...`
 *
 * @param {string} base64Image
 * @returns {Promise<string>} The uploaded image URL 
 */
export async function uploadDrawingToCloudinary(base64Image) {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
        throw new Error('Cloudinary environment variables missing');
    }

    const formData = new FormData();
    formData.append('file', base64Image);
    formData.append('upload_preset', uploadPreset);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`Cloudinary upload failed: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await res.json();
    return data.secure_url;
}
