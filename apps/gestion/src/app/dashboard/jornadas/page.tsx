import React from "react";
import { UploadJornadasForm } from "@/components/jornadas/UploadJornadasForm";
import { SessionsList } from "@/components/jornadas/SessionsList";

export default function JornadasPage() {
  return (
    <div className="min-h-screen bg-gray-100 py-10">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Gestión de Jornadas
          </h1>
          <p className="text-gray-600 mt-2">
            Sube los ficheros de planificación y fichajes para realizar la
            casación automática.
          </p>
        </div>

        <UploadJornadasForm />

        <div className="mt-12">
          <SessionsList />
        </div>
      </div>
    </div>
  );
}
