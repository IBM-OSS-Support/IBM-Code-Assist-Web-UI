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
  Grid,
  Column,
  CodeSnippet,
  Pagination,
  DatePickerSkeleton,
  InlineLoading,
} from "@carbon/react";
import "./_ModelServerLogs.scss";
import { Loading } from "@carbon/react";

interface LogFile {
  name: string;
  date: string;
}

const headers: { key: keyof LogFile; header: string }[] = [
  { key: "name", header: "Log File Name" },
  { key: "date", header: "Created Date" },
];

const GITHUB_USERNAME = "IBM-OSS-Support";
const REPO_BRANCH = "gh-pages";
const GITHUB_LOG_URL = `https://raw.githubusercontent.com/${GITHUB_USERNAME}/IBM-Code-Assist-Web-UI/${REPO_BRANCH}/logs`;

const LogsTable: React.FC = () => {
  const [logFiles, setLogFiles] = useState<LogFile[]>([]);
  const [selectedLog, setSelectedLog] = useState<string | null>(null);
  const [logContent, setLogContent] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const formatDate = (dateStr: string) => {
    const date = new Date(
      `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}T${dateStr.substring(9, 11)}:${dateStr.substring(11, 13)}:${dateStr.substring(13, 15)}`
    );
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).replace(",", "");
  };

  useEffect(() => {
    const fetchLogFiles = async () => {
      try {
        const logsJsonUrl = `${GITHUB_LOG_URL}/logs.json`;
        const response = await fetch(logsJsonUrl);
        if (!response.ok) throw new Error("Failed to fetch log files");
        const files: string[] = await response.json();

        const formattedFiles: LogFile[] = files.map((file) => {
          const fileNameWithoutLogs = file.replace("logs/", "");
          const match = fileNameWithoutLogs.match(/_(\d{8}_\d{6})/);
          const date = match ? formatDate(match[1]) : "Unknown Date";
          return { name: fileNameWithoutLogs, date };
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
      setIsLoading(true); // Show loading spinner
      setSelectedLog(fileName);
      setIsModalOpen(true); // Open modal immediately with spinner
  
      const logFileUrl = `https://raw.githubusercontent.com/IBM-OSS-Support/IBM-Code-Assist-Web-UI/${REPO_BRANCH}/logs/${fileName}`;
      const response = await fetch(logFileUrl);
      if (!response.ok) throw new Error("Failed to fetch log content");
      const content = await response.text();
  
      setLogContent(content);
    } catch (error) {
      console.error("Error fetching log content:", error);
      setLogContent("⚠️ Failed to load content.");
    } finally {
      setIsLoading(false); // Hide loading spinner
    }
  };
  
  

  // Slice data based on current page
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedFiles = logFiles.slice(startIndex, endIndex);

  return (
    <div className="model-server-logs-wrap">
      <Grid fullWidth narrow className="page-content">
        <Column sm={4} md={8} lg={16}>
          <div className="heading-wrap">
            <h3>Log Files</h3>
          </div>
        </Column>

        <Column sm={4} md={8} lg={16}>
          <DataTable
            rows={paginatedFiles.map((f, i) => ({
              id: `${startIndex + i}`,
              ...f,
            }))}
            headers={headers}
          >
            {({
              rows,
              headers,
              getHeaderProps,
              getRowProps,
              getTableProps,
            }) => (
              <TableContainer>
                <Table {...getTableProps()}>
                  <TableHead>
                    <TableRow>
                      {headers.map((header) => (
                        <TableHeader {...getHeaderProps({ header })} key={header.key}>
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
                                cell.info.header === "name" ? "#e4e4e4" : "inherit",
                              height: "4.7rem",
                            }}
                          >
                            <div className="cell-content">
                              <p style={{ height: "1.3rem" }}></p>
                              <span>{cell.value}</span>
                              {cell.info.header === "name" && cell.value && (
                                <p>
                                  Click on the Log File Name ({cell.value}) to view its
                                  content.
                                </p>
                              )}
                            </div>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </DataTable>

          <Pagination
            totalItems={logFiles.length}
            pageSize={itemsPerPage}
            pageSizes={[5, 10, 20, 30]}
            onChange={({ page, pageSize }) => {
              setCurrentPage(page);
              setItemsPerPage(pageSize);
            }}
            page={currentPage}
          />
        </Column>
      </Grid>

      {isLoading ? (
            <div className="loader-wrap">
                <Loading />
            </div>
        ) : (
            <Modal
                open={isModalOpen}
                modalHeading={`Log Content: ${selectedLog}`}
                passiveModal
                onRequestClose={() => setIsModalOpen(false)}
                size="md"
            >
            
                    <CodeSnippet
                    key={`${selectedLog}-${Date.now()}`}
                    type="multi"
                    feedback="Copied to clipboard"
                    >
                    {logContent || "No content available"}
                    </CodeSnippet>
            </Modal>
        )}
    </div>
  );
};

export default LogsTable;
