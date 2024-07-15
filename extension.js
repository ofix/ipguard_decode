const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const hidefile = require('hidefile');
// 执行系统命令
const { exec, execSync } = require('child_process');
const ip_guard = "D:/.ip_guard";

function sleep (ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function visitFolder (folderPath, callback) {
    try {
        const files = fs.readdirSync(folderPath);
        for (const file of files) {
            const filePath = path.join(folderPath, file);
            const stats = fs.statSync(filePath);
            if (stats.isDirectory()) {
                visitFolder(filePath, callback);
            } else {
                callback(filePath);
            }
        }
    } catch (err) {
        vscode.window.showErrorMessage(err.message);
    }
}

function getHiddenRootDirInDDriver (project_dir_path) {
    const dir_name = path.basename(project_dir_path);
    return ip_guard + "/." + dir_name;
}

function getTargetRootDirInDDriver (project_dir_path) {
    const dir_name = path.basename(project_dir_path);
    return ip_guard + "/" + dir_name;
}

function getHiddenFilePathInDDriver (file_path, prefix_len) {
    const file_path_suffix = file_path.substr(prefix_len);
    return ip_guard + "/." + file_path_suffix;
}

function writeFile (file_path, file_content) {
    const dir_path = path.dirname(file_path);
    if (!fs.existsSync(dir_path)) {
        fs.mkdirSync(dir_path, { recursive: true });
    }
    // 写入内容
    fs.writeFileSync(file_path, file_content, 'utf8');
}

function removeFileExtension (file_path) {
    const dirPath = path.dirname(file_path);
    const fileNameWithoutExtension =
        path.basename(file_path, path.extname(file_path));
    return path.join(dirPath, fileNameWithoutExtension);
}

function deleteDirSync (dir_path) {
    fs.readdirSync(dir_path).forEach((file) => {
        const file_path = `${dir_path}/${file}`;
        if (fs.lstatSync(file_path).isDirectory()) {
            deleteDirSync(file_path);
        } else {
            fs.unlinkSync(file_path);
        }
    });
    fs.rmdirSync(dir_path);
}



/**
 * @brief 设计思路，在C盘创建一个隐藏目录，把解密文件写入到隐藏目录相同路径下，然后删除原路径下的文件，拷贝解密文件到最有目录中
 * @param {vscode.ExtensionContext} context
 */
function activate (context) {
    const command =
        vscode.commands.registerCommand('decode.greatwall', async () => {
            // 在此处编写命令的执行逻辑
            if (!fs.existsSync(ip_guard)) {
                fs.mkdirSync(ip_guard, { recursive: true });
                hidefile.hideSync(ip_guard);
            }
            const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
            const parent_dir = path.dirname(workspaceFolder);
            const parent_dir_length = parent_dir.length + 1;
            const hiddenRoot = getHiddenRootDirInDDriver(workspaceFolder);
            const targetRoot = getTargetRootDirInDDriver(workspaceFolder);
            // 清空整个目录
            if (fs.existsSync(hiddenRoot)) {
                deleteDirSync(hiddenRoot);
            }
            fs.mkdirSync(targetRoot, { recursive: true });
            const _hiddenRoot = hidefile.hideSync(targetRoot);
            // 文件映射
            let file_map = {};
            visitFolder(workspaceFolder, (file_path) => {
                const ext = path.extname(file_path);
                if (ext == '.java' || ext == '.cpp' || ext == '.h' || ext == '.c' ||
                    ext == '.js' || ext == '.php' || ext == '.vue' ||
                    ext == '.html' || ext == '.sh' || ext == '.yaml' ||
                    ext == '.yml' || ext == '.sql' || ext == '.py' || ext == '.go' ||
                    ext == '.cs') {
                    // 读取文件内容
                    const file_content = fs.readFileSync(file_path, 'utf-8');
                    // 需要写入的隐藏路径
                    let hidden_file_path = getHiddenFilePathInDDriver(file_path, parent_dir_length);
                    let decode_file_path = removeFileExtension(hidden_file_path);
                    file_map[decode_file_path] = { extension: ext, origin_file: file_path };
                    console.log(decode_file_path);
                    writeFile(decode_file_path, file_content);
                }
            });

            sleep(1000);

            // 批量修改文件名
            try {
                for (key in file_map) {
                    if (file_map.hasOwnProperty(key)) {
                        const origin_file_name = key;
                        let o = file_map[key];
                        const dest_file_name = key + o.extension;
                        if (fs.lstatSync(origin_file_name).isFile()) {
                            const cmd = 'mv ' + origin_file_name + " " + dest_file_name;
                            // 解密文件 + 文件后缀名
                            execSync(cmd);
                            // 删除源文件
                            fs.unlinkSync(o.origin_file);
                            // 拷贝新文件
                            fs.copyFileSync(dest_file_name, o.origin_file);
                        }
                    }
                }
            } catch (err) {
                vscode.window.showErrorMessage(err.message);
            }
            // 删除隐藏目录
            if (fs.existsSync(hiddenRoot)) {
                deleteDirSync(hiddenRoot);
            }
        });
    context.subscriptions.push(command);
}

function deactivate () { }

module.exports = {
    activate,
    deactivate
}
