<?php
    $version = '0.4';
    function addScripts($scriptNames) {
        foreach ($scriptNames as $scriptName) {
            $version = hash_file('md5', $scriptName);
            ?>
<script src="<?=  $scriptName . '?v=' . $version ?>"></script><?php
        }
    }
?>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <script src="lib/jquery.min.js"></script>
    <script src="lib/jstorage.min.js"></script>
    <script>
        var assetVersion = '<?= $version ?>';
    </script>
</head>
<body style="margin: 0; padding:0;">
    <canvas width="800" height="600" style="touch-action: none;"></canvas>
    <?php addScripts(['utils.js', 'globals.js', 'images.js', 'fastMode.js', 'loot.js', 'gems.js', 'skills.js', 'hero.js', 'battle.js', 'monsters.js', 'saveGame.js', 'titleScene.js', 'mapScene.js', 'dungeon.js', 'drawScene.js', 'main.js']) ?>
</body>
</html>