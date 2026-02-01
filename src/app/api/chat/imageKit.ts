import imageKit from "imagekit";

export async function uploadImageToImageKit(
  base64Image: string,
  fileName: string = "generated_image.png",
): Promise<string> {
  const ik = new imageKit({
    publicKey: process.env.NEXT_PUBLIC_IMAGE_KIT_PUBLIC_KEY!,
    privateKey: process.env.IMAGE_KIT_PRIVATE_KEY!,
    urlEndpoint: process.env.NEXT_PUBLIC_IMAGE_KIT_URL_ENDPOINT!,
  });
  const response = await ik.upload({
    file: base64Image,
    fileName: fileName,
  });
  return response.url;
}
