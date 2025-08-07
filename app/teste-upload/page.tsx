'use client';

import { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase'; // ajuste o caminho se necessário
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';

export default function TesteUploadPage() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
    } else {
      setPdfFile(null);
      toast({
        title: 'Arquivo inválido',
        description: 'Selecione um arquivo PDF válido.',
        variant: 'destructive',
      });
    }
  };

  const handleUpload = async () => {
    if (!pdfFile) return;

    const timestamp = Date.now();
    const sanitizedName = pdfFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `testeUploads/${timestamp}_${sanitizedName}`;
    const fileRef = ref(storage, storagePath);

    console.log('🟡 Iniciando upload do arquivo:', pdfFile.name);
    console.log('📁 Caminho no Storage:', storagePath);

    try {
      // Faz o upload
      await uploadBytes(fileRef, pdfFile);

      // Obtém URL pública correta
      const downloadURL = await getDownloadURL(fileRef);
      console.log('🔗 URL pública do PDF:', downloadURL);

      toast({
        title: '✅ Upload concluído!',
        description: 'Arquivo disponível publicamente.',
      });

      // Opcional: copiar a URL para a área de transferência
      await navigator.clipboard.writeText(downloadURL);
      console.log('📋 URL copiada para a área de transferência!');
    } catch (error: any) {
      console.error('❌ Erro ao fazer upload:', error);
      toast({
        title: 'Erro ao fazer upload',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Upload de PDF - Teste</h1>

      <Label htmlFor="pdf">Selecione um PDF</Label>
      <Input
        id="pdf"
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        className="mb-4"
      />

      <Button onClick={handleUpload} disabled={!pdfFile}>
        Fazer Upload
      </Button>
    </div>
  );
}
