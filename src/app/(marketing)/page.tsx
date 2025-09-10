import Logo from "@/components/logo";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="bg-[#2c8396] min-h-screen flex flex-col xl:flex-row items-center justify-center gap-10">
      <Image
        src="/images/caresoft-preview.png"
        alt="Preview of CareSoft"
        width={519}
        height={472}
      />

      <div>
        <Logo />
        <h1 className="text-5xl font-semibold my-6 max-w-[500px]">
          Manage your <span className="font-extrabold">daycare</span> with ease
        </h1>
        <p className="text-2xl font-medium max-w-[600px]">
          Use CareSoft to easily keep track of kids under your care. Get
          lifetime access for $299.
        </p>
        <div className="mt-10 space-x-3">
          <Button asChild>
            <Link href="/signup">Get started</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/login">Log in</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
