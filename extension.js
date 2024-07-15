const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const hidefile = require('hidefile');
// 执行系统命令
const { exec, execSync } = require('child_process');

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

function getBackupRootDir (file_path) {
    return file_path + '_decode';
}

function getHiddenRootDir (file_path) {
    const dir_path = path.dirname(file_path);
    const file_name = path.basename(file_path);
    return path.join(dir_path, "." + file_name + "_decode");
}

function getHiddenRootDirInCDriver (project_dir_path) {
    const dir_name = path.basename(project_dir_path);
    return "C:/Windows/" + dir_name;
}

function getHiddenFilePathInCDriver (file_path, prefix_len) {
    const file_path_suffix = file_path.substr(prefix_len);
    return "C:/Windows/" + file_path_suffix;
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
            const workspaceFolder = vscode.workspace.workspaceFolders[0].uri.fsPath;
            const parent_dir = path.dirname(workspaceFolder);
            const parent_dir_length = parent_dir.length;
            // const current_dir = path.basename(workspaceFolder);
            // const backupRoot = getBackupRootDir(workspaceFolder);
            // const hiddenRoot = getHiddenRootDir(workspaceFolder);
            const hiddenRoot = getHiddenRootDirInCDriver(workspaceFolder);
            // 清空整个目录
            if (fs.existsSync(hiddenRoot)) {
                deleteDirSync(hiddenRoot);
            }
            fs.mkdirSync(hiddenRoot, { recursive: true });
            const _hiddenRoot = hidefile.hideSync(hiddenRoot);
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
                    // let hidden_file_path = file_path.replace(current_dir, '.' + current_dir + '_decode');
                    let hidden_file_path = getHiddenFilePathInCDriver(file_path, parent_dir_length);
                    let decode_file_path = removeFileExtension(hidden_file_path);
                    file_map[decode_file_path] = { extension: ext, origin_file: file_path };
                    console.log(decode_file_path);
                    writeFile(decode_file_path, file_content);
                }
            });

            sleep(3000);

            // 批量修改文件名
            for (key in file_map) {
                if (file_map.hasOwnProperty(key)) {
                    const origin_file_name = key;
                    let o = file_map[key];
                    const dest_file_name = key + o.extension;
                    const cmd = 'mv ' + origin_file_name + " " + dest_file_name;
                    // 解密文件 + 文件后缀名
                    execSync(cmd);
                    // 删除源文件
                    fs.unlinkSync(o.origin_file);
                    // 拷贝新文件
                    fs.copyFileSync(dest_file_name, o.origin_file);
                }
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
