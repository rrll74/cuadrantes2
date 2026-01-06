"use client";

import React from "react";
import { useParams } from "next/navigation";
import { ResultsTable } from "@/components/jornadas/ResultsTable";

export default function JornadaResultsPage() {
  const params = useParams();
  const sessionId = Number(params.id);

  if (!sessionId || isNaN(sessionId)) {
    return <div className="p-8 text-red-600">ID de sesión inválido</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">
        Resultados de la Jornada #{sessionId}
      </h1>
      <div className="bg-white rounded-lg shadow p-6">
        <ResultsTable sessionId={sessionId} />
      </div>
    </div>
  );
}
