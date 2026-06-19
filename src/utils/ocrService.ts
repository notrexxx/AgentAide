import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

const OCR_SPACE_API_KEY = 'K89478909888957';

export async function processImageForOCR(localUri: string): Promise<string | null> {
  try {
    const compressedImage = await ImageManipulator.manipulateAsync(
      localUri,
      [{ resize: { width: 1024 } }],
      { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
    );

    const base64Image = await FileSystem.readAsStringAsync(compressedImage.uri, {
      encoding: 'base64',
    });

    const base64Prefix = 'data:image/jpeg;base64,';
    const base64Data = base64Prefix + base64Image;

    const formData = new FormData();
    formData.append('base64Image', base64Data);
    formData.append('language', 'eng');
    formData.append('isOverlayRequired', 'false');

    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        'apikey': OCR_SPACE_API_KEY,
      },
      body: formData,
    });

    const result = await response.json();

    if (result.IsErroredOnProcessing) {
      console.error('OCR API Error:', result.ErrorMessage);
      throw new Error(result.ErrorMessage[0]);
    }

    if (result.ParsedResults && result.ParsedResults.length > 0) {
      const parsedText = result.ParsedResults.map((pr: any) => pr.ParsedText).join('\n');
      return parsedText;
    }

    return null;

  } catch (error) {
    console.error('OCR Processing failed:', error);
    throw error;
  }
}