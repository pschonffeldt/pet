import Image from "next/image";

export default function Home() {
  return (
    <main className="bg-[#5dc9a8] min-h-screen">
      <Image
        src="https://bytegrad.com/course-assets/react-nextjs/petsoft-preview.png"
        alt="Preview of PetSoft"
        width={519}
        height={472}
      />
      <div></div>
    </main>
  );
}
