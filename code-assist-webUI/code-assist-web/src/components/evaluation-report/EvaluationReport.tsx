import React, { useEffect, useState } from "react";
import {
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Modal,
  Button,
  Grid,
  Column,
} from "@carbon/react";
import type { DataTableHeader } from "@carbon/react";

interface LogFile {
  name: string;
  date: string;
}

const LogsTable = () => {
  const [logFiles, setLogFiles] = useState<LogFile[]>([]);
  const [selectedLog, setSelectedLog] = useState<string | null>(null);
  const [logContent, setLogContent] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Type definitions for DataTable
  const headers: DataTableHeader[] = [
    { key: "name", header: "Log File Name" },
    { key: "date", header: "Date" },
  ];

  useEffect(() => {
    const fetchLogFiles = async () => {
      try {
        const response = await fetch("/logs");
        if (!response.ok) throw new Error("Failed to fetch log files");
        const files = await response.json();
        const formattedFiles = files.map((file: string) => ({
          name: file,
          date: file.match(/_(\d{8}T\d{6})/)?.[1] || "Unknown Date",
        }));
        setLogFiles(formattedFiles);
      } catch (error) {
        console.error("Error fetching log files:", error);
      }
    };

    fetchLogFiles();
  }, []);

  const fetchLogContent = async (fileName: string) => {
    try {
      const response = await fetch(`/logs/${fileName}`);
      if (!response.ok) throw new Error("Failed to fetch log content");
      const content = await response.text();
      setSelectedLog(fileName);
      setLogContent(content);
      setIsModalOpen(true);
    } catch (error) {
      console.error("Error fetching log content:", error);
    }
  };

  return (
    <div className="evaluation-comparison-wrap">
      <Grid fullWidth narrow className="page-content">
        <Column sm={4} md={8} lg={16}>
          <div className="heading-wrap">
            <h3>Models Server Log Table</h3>
          </div>
        </Column>
        <Column sm={4} md={8} lg={16}>
          <DataTable
            rows={logFiles.map((file, index) => ({
              id: index.toString(),
              ...file,
            }))}
            headers={headers}
            render={({ rows, headers, getHeaderProps, getRowProps }) => (
              <Table>
                <TableHead>
                  <TableRow>
                    {headers.map((header) => (
                      <TableHeader
                        {...getHeaderProps({ header })}
                        key={header.key}
                      >
                        {header.header}
                      </TableHeader>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow
                      {...getRowProps({ row })}
                      key={row.id}
                      onClick={() => {
                        const fileIndex = parseInt(row.id);
                        const fileName = logFiles[fileIndex]?.name;
                        if (fileName) fetchLogContent(fileName);
                      }}
                      style={{ cursor: "pointer" }}
                    >
                      {row.cells.map((cell) => (
                        <TableCell key={cell.id}>{cell.value}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          />
        </Column>
      </Grid>

      <Modal
        open={isModalOpen}
        modalHeading={`Log Content: ${selectedLog}`}
        passiveModal
        onRequestClose={() => setIsModalOpen(false)}
      >
        <pre style={{ whiteSpace: "pre-wrap", wordWrap: "break-word" }}>
          {logContent || "No content available"}
        </pre>
      </Modal>
    </div>
  );
};

export default LogsTable;