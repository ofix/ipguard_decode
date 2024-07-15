const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const hidefile = require('hidefile');
// 执行系统命令
const { exec } = require('child_process');

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function visitFolder(folderPath, callback) {
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

function getBackupRootDir(file_path) {
    return file_path + '_decode';
}

function getHiddenRootDir(file_path) {
    const dir_path = path.dirname(file_path);
    const file_name = path.basename(file_path);
    return path.join(dir_path, "." + file_name + "_decode");
}

function writeFile(file_path, file_content) {
    const dir_path = path.dirname(file_path);
    if (!fs.existsSync(dir_path)) {
        fs.mkdirSync(dir_path, { recursive: true });
    }
    // 写入内容
    fs.writeFileSync(file_path, file_content, 'utf8');
}

function decodeFilePath(file_path) {
    const dirPath = path.dirname(file_path);
    const fileNameWithoutExtension =
        path.basename(file_path, path.extname(file_path));
    return path.join(dirPath, fileNameWithoutExtension);
}

function deleteDirSync(dir_path) {
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
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    const command =
        vscode.commands.registerCommand('decode.greatwall', async () => {
            // 在此处编写命令的执行逻辑
            const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
            const current_dir = path.basename(workspaceFolder);
            const backupRoot = getBackupRootDir(workspaceFolder);
            const hiddenRoot = getHiddenRootDir(workspaceFolder);
            // 清空整个目录
            if (fs.existsSync(hiddenRoot)) {
                deleteDirSync(hiddenRoot);
            }
            fs.mkdirSync(backupRoot, { recursive: true });
            const _hiddenRoot = hidefile.hideSync(backupRoot);
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
                    let hidden_file_path =
                        file_path.replace(current_dir, '.' + current_dir + '_decode');
                    let decode_file_path = decodeFilePath(hidden_file_path);
                    file_map[decode_file_path] = ext;
                    writeFile(decode_file_path, file_content);
                }
            });

            sleep(3000);

            // 批量修改文件名
            for (key in file_map) {
                if (file_map.hasOwnProperty(key)) {
                    const origin_file_name = key;
                    const dest_file_name = key + file_map[key];
                    const cmd = 'mv ' + origin_file_name + " " + dest_file_name;
                    exec(cmd, (error, stdout, stderr) => {
                        if (error) {
                            console.error(`文件重命名错误: ${error}`);
                            return;
                        }
                    });
                    // fs.renameSync(key, key + file_map[key]);
                }
            }
            // // 获取文件内容
            // const file_content = editor.document.getText();
            // // 获取文件路径
            // const old_file_path = editor.document.uri.fsPath;
            // // 移除文件后缀名
            // const new_file_path = old_file_path.split('.').slice(0,
            // -1).join('.'); try {
            //     // 写入新文件
            //     fs.writeFileSync(new_file_path, file_content, 'utf8');
            //     await sleep(2000); // 暂停 1 秒
            //     // 删除老文件
            //     fs.unlinkSync(old_file_path);
            //     await sleep(2000); // 暂停 1.2秒
            //     // 重命名文件
            //     fs.renameSync(new_file_path, old_file_path);
            //     vscode.window.showInformationMessage('解密成功！');
            // } catch (e) {
            //     vscode.window.showErrorMessage('解密失败！');
            // }
        });
    context.subscriptions.push(command);
}

function deactivate() { }

module.exports = {
    activate,
    deactivate
}
