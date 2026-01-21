import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";
import { DataTable } from "./DataTable";
import { createColumnHelper, ColumnDef } from "@tanstack/react-table";

describe("DataTable Component", () => {
  interface TestData {
    id: number;
    name: string;
    email: string;
  }

  const columnHelper = createColumnHelper<TestData>();

  const columns: ColumnDef<TestData, unknown>[] = [
    columnHelper.accessor("id", {
      header: "ID",
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor("name", {
      header: "Nombre",
      cell: (info) => info.getValue(),
    }),
    columnHelper.accessor("email", {
      header: "Email",
      cell: (info) => info.getValue(),
    }),
  ];

  const testData: TestData[] = [
    { id: 1, name: "Juan Pérez", email: "juan@example.com" },
    { id: 2, name: "María López", email: "maria@example.com" },
    { id: 3, name: "Carlos García", email: "carlos@example.com" },
  ];

  it("debe renderizar correctamente con datos", () => {
    render(<DataTable<TestData> columns={columns} data={testData} />);

    expect(screen.getByText("ID")).toBeInTheDocument();
    expect(screen.getByText("Nombre")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.getByText("maria@example.com")).toBeInTheDocument();
  });

  it("debe renderizar encabezados de tabla correctamente", () => {
    render(<DataTable<TestData> columns={columns} data={testData} />);

    const headers = screen.getAllByRole("columnheader");
    expect(headers).toHaveLength(3);
    expect(headers[0]).toHaveTextContent("ID");
    expect(headers[1]).toHaveTextContent("Nombre");
    expect(headers[2]).toHaveTextContent("Email");
  });

  it("debe renderizar filas con datos correctamente", () => {
    render(<DataTable<TestData> columns={columns} data={testData} />);

    const rows = screen.getAllByRole("row");
    // 1 header + 3 data rows
    expect(rows).toHaveLength(4);
    expect(rows[1]).toHaveTextContent("1");
    expect(rows[1]).toHaveTextContent("Juan Pérez");
  });

  it("debe mostrar mensaje vacío cuando no hay datos", () => {
    const emptyMessage = "No hay registros disponibles";
    render(
      <DataTable<TestData>
        columns={columns}
        data={[]}
        emptyMessage={emptyMessage}
      />,
    );

    expect(screen.getByText(emptyMessage)).toBeInTheDocument();
  });

  it("debe usar el mensaje vacío por defecto cuando no se proporciona", () => {
    render(<DataTable<TestData> columns={columns} data={[]} />);

    expect(
      screen.getByText("No se encontraron resultados."),
    ).toBeInTheDocument();
  });

  it("debe mostrar loader cuando está cargando", () => {
    const { container } = render(
      <DataTable<TestData>
        columns={columns}
        data={testData}
        isLoading={true}
      />,
    );

    const loader = container.querySelector(".animate-spin");
    expect(loader).toBeInTheDocument();
  });

  it("debe no mostrar loader cuando no está cargando", () => {
    const { container } = render(
      <DataTable<TestData>
        columns={columns}
        data={testData}
        isLoading={false}
      />,
    );

    const loader = container.querySelector(".animate-spin");
    expect(loader).not.toBeInTheDocument();
  });

  it("debe renderizar tabla con estructura correcta", () => {
    const { container } = render(
      <DataTable<TestData> columns={columns} data={testData} />,
    );

    const table = container.querySelector("table");
    expect(table).toBeInTheDocument();

    const thead = container.querySelector("thead");
    expect(thead).toBeInTheDocument();

    const tbody = container.querySelector("tbody");
    expect(tbody).toBeInTheDocument();
  });

  it("debe manejar datos complejos en celdas", () => {
    interface ComplexData {
      id: number;
      status: string;
      amount: number;
    }

    const complexColumns: ColumnDef<ComplexData, unknown>[] = [
      columnHelper.accessor("id", { header: "ID" }),
      columnHelper.accessor("status", {
        header: "Estado",
        cell: (info) => (
          <span className={`status-${info.getValue()}`}>
            {String(info.getValue())}
          </span>
        ),
      }),
      columnHelper.accessor("amount", {
        header: "Monto",
        cell: (info) => `$${info.getValue()}`,
      }),
    ];

    const complexData: ComplexData[] = [
      { id: 1, status: "active", amount: 100 },
      { id: 2, status: "pending", amount: 200 },
    ];

    render(
      <DataTable<ComplexData> columns={complexColumns} data={complexData} />,
    );

    expect(screen.getByText("$100")).toBeInTheDocument();
    expect(screen.getByText("$200")).toBeInTheDocument();
    expect(screen.getByText("active")).toBeInTheDocument();
  });

  it("debe aplicar clases CSS correctamente", () => {
    const customClass = "custom-table-class";
    const { container } = render(
      <DataTable<TestData>
        columns={columns}
        data={testData}
        className={customClass}
      />,
    );

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass(customClass);
  });

  it("debe renderizar tabla con múltiples filas", () => {
    const largeData = Array(100)
      .fill(null)
      .map((_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
      }));

    const { container } = render(
      <DataTable<TestData> columns={columns} data={largeData} />,
    );

    const tbody = container.querySelector("tbody");
    const rows = tbody?.querySelectorAll("tr:not(:last-child)");
    expect(rows?.length).toBe(100);
  });
});
