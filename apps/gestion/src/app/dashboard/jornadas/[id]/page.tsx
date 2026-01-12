"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { ResultsTable } from "@/components/jornadas/ResultsTable";
import { UnmatchedResultsTable } from "@/components/jornadas/UnmatchedResultsTable";
import { usePermissions } from "@/hooks/usePermissions";
import { clsx } from "clsx";

export default function JornadaResultsPage() {
  const params = useParams();
  const sessionId = Number(params.id);
  const canRead = usePermissions("jornadas:read");
  const isAdmin = usePermissions("admin");
  const [activeTab, setActiveTab] = useState<"matched" | "unmatched">(
    "matched",
  );

  const hasReadAccess = canRead || isAdmin;

  if (!hasReadAccess) {
    return (
      <div className="p-8 text-red-600">
        No tienes permisos para ver esta sección.
      </div>
    );
  }

  if (!sessionId || isNaN(sessionId)) {
    return <div className="p-8 text-red-600">ID de sesión inválido</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">
        Resultados de la Jornada #{sessionId}
      </h1>

      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={clsx(
            "py-2 px-4 font-medium text-sm focus:outline-none border-b-2 transition-colors",
            activeTab === "matched"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
          )}
          onClick={() => setActiveTab("matched")}
        >
          Resultados Casados
        </button>
        <button
          className={clsx(
            "py-2 px-4 font-medium text-sm focus:outline-none border-b-2 transition-colors",
            activeTab === "unmatched"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
          )}
          onClick={() => setActiveTab("unmatched")}
        >
          Fichajes sin Ruta
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {activeTab === "matched" ? (
          <ResultsTable sessionId={sessionId} />
        ) : (
          <UnmatchedResultsTable sessionId={sessionId} />
        )}
      </div>
    </div>
  );
}
