import React, { useEffect, useState } from "react";
import {
  DataTable,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Modal,
  Button,
  Grid,
  Column,
} from "@carbon/react";

// Define log file type
interface LogFile {
  name: string;
  date: string;
}

// Define header structure for DataTable
const headers: { key: keyof LogFile; header: string }[] = [
  { key: "name", header: "Log File Name" },
  { key: "date", header: "Date" },
];

const GITHUB_USERNAME = "IBM-OSS-Support";
const REPO_BRANCH = "gh-pages";
const GITHUB_LOG_URL = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/IBM-Code-Assist-Web-UI/${REPO_BRANCH}/logs`

const LogsTable: React.FC = () => {
  const [logFiles, setLogFiles] = useState<LogFile[]>([]);
  const [selectedLog, setSelectedLog] = useState<string | null>(null);
  const [logContent, setLogContent] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch log files
  useEffect(() => {
    const fetchLogFiles = async () => {
      try {
        // Fetch the logs.json from the raw GitHub content URL
        const logsJsonUrl = `${GITHUB_LOG_URL}/logs.json`;
        const response = await fetch(logsJsonUrl);
        if (!response.ok) throw new Error("Failed to fetch log files");
        const files: string[] = await response.json();

        // Format the files (extract date from filename if possible)
        const formattedFiles: LogFile[] = files.map((file) => {
          const match = file.match(/_(\d{8}T\d{6})/); // Match the date in the filename
          const date = match ? match[1] : "Unknown Date";
          return { name: file, date };
        });
        setLogFiles(formattedFiles);
      } catch (error) {
        console.error("Error fetching log files:", error);
      }
    };

    fetchLogFiles();
  }, []);

  const fetchLogContent = async (fileName: string) => {
    try {
      // Construct the raw GitHub URL for the log file
      const logFileUrl = `https://raw.githubusercontent.com/IBM-OSS-Support/Continue.dev-Granite-manual-test-cases/harsh_prompt_automation/logs/${fileName}`;
      const response = await fetch(logFileUrl);
      if (!response.ok) throw new Error("Failed to fetch log content");
      const content = await response.text();
      setLogContent(content);
      setSelectedLog(fileName);
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
          <DataTable rows={logFiles.map((f, i) => ({ id: i.toString(), ...f }))} headers={headers}>
            {({
              rows,
              headers,
              getHeaderProps,
              getRowProps,
              getTableProps,
            }) => (
              <TableContainer title="Log Files">
                <Table {...getTableProps()}>
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
                      <TableRow {...getRowProps({ row })} key={row.id}>
                        {row.cells.map((cell) => (
                          <TableCell
                            key={cell.id}
                            onClick={() =>
                              cell.info.header === "name" &&
                              fetchLogContent(cell.value)
                            }
                            style={{
                              cursor:
                                cell.info.header === "name" ? "pointer" : "default",
                              color:
                                cell.info.header === "name" ? "blue" : "inherit",
                            }}
                          >
                            {cell.value}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DataTable>
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
